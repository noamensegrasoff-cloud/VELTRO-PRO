\set ON_ERROR_STOP on

-- Exercise the migration under an authenticated workspace owner.
set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);

do $test$
declare
  v_workspace uuid := '10000000-0000-4000-8000-000000000001';
  v_first jsonb;
  v_second jsonb;
  v_replay jsonb;
  v_status text;
  v_ledger_rows integer;
  v_current jsonb;
begin
  select result.sync_status, result.record_data
    into v_status, v_first
  from public.sync_cloud_record_cas(
    v_workspace, 'products', 'product-1',
    '{"stock":10}'::jsonb, 'device-a', 'operation-a', null, false
  ) as result;

  if v_status <> 'synced' or v_first->'payload'->>'stock' <> '10'
     or v_first->>'last_operation_id' <> 'operation-a' then
    raise exception 'Initial idempotent insert did not return the expected cloud row.';
  end if;

  -- A second authenticated workspace member represents another device/session.
  perform pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', false);

  select result.sync_status, result.record_data
    into v_status, v_second
  from public.sync_cloud_record_cas(
    v_workspace, 'products', 'product-1',
    '{"stock":15}'::jsonb, 'device-b', 'operation-b',
    (v_first->>'updated_at')::timestamptz, false
  ) as result;

  if v_status <> 'synced' or v_second->'payload'->>'stock' <> '15'
     or v_second->>'last_operation_id' <> 'operation-b'
     or v_second->>'updated_by' <> '20000000-0000-4000-8000-000000000003' then
    raise exception 'The second authenticated workspace member did not replace the first snapshot.';
  end if;

  -- The original writer retries after the other workspace member has updated the row.
  perform pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);

  select result.sync_status, result.record_data
    into v_status, v_replay
  from public.sync_cloud_record_cas(
    v_workspace, 'products', 'product-1',
    '{"stock":10}'::jsonb, 'device-a', 'operation-a', null, false
  ) as result;

  if v_status <> 'synced' or v_replay is distinct from v_first then
    raise exception 'A delayed retry did not return its original acknowledgement.';
  end if;

  select pg_catalog.to_jsonb(current_row)
    into v_current
  from public.cloud_records as current_row
  where current_row.workspace_id = v_workspace
    and current_row.entity_type = 'products'
    and current_row.record_id = 'product-1';

  if v_current->'payload'->>'stock' <> '15'
     or v_current->>'last_operation_id' <> 'operation-b' then
    raise exception 'A delayed retry overwrote the newer cloud snapshot.';
  end if;

  begin
    perform public.sync_cloud_record_cas(
      v_workspace, 'products', 'product-1',
      '{"stock":999}'::jsonb, 'device-a', 'operation-a', null, false
    );
    raise exception 'Expected a reused operation ID with a different payload to be rejected.';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.sync_cloud_record_cas(
      v_workspace, 'products', 'product-2',
      '{"stock":10}'::jsonb, 'device-a', 'operation-a', null, false
    );
    raise exception 'Expected cross-record operation ID reuse to be rejected.';
  exception
    when sqlstate '23505' then null;
  end;

  -- The second authenticated member also proves that a stale version is rejected.
  perform pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', false);

  select result.sync_status
    into v_status
  from public.sync_cloud_record_cas(
    v_workspace, 'products', 'product-1',
    '{"stock":20}'::jsonb, 'device-c', 'operation-stale',
    (v_first->>'updated_at')::timestamptz, false
  ) as result;

  if v_status <> 'conflict' then
    raise exception 'A stale expected cloud version was not rejected as a conflict.';
  end if;

  begin
    perform public.sync_cloud_record_cas(
      v_workspace, 'products', 'product-blank',
      '{"stock":1}'::jsonb, 'device-a', '   ', null, false
    );
    raise exception 'Expected a blank operation ID to be rejected.';
  exception
    when sqlstate '22023' then null;
  end;

  select count(*) into v_ledger_rows
  from public.cloud_record_sync_operations
  where workspace_id = v_workspace;

  if v_ledger_rows <> 2 then
    raise exception 'Expected exactly two acknowledged operation receipts, found %.', v_ledger_rows;
  end if;
end;
$test$;

-- An authenticated member with read-only access must not be able to forge a
-- receipt for an existing cloud row by inserting directly into the ledger.
reset role;
insert into public.cloud_records (
  workspace_id, entity_type, record_id, payload, device_id,
  updated_by, updated_at, deleted_at, last_operation_id
)
values (
  '10000000-0000-4000-8000-000000000001',
  'products', 'reader-only-product', '{"stock":2}'::jsonb, 'owner-device',
  '20000000-0000-4000-8000-000000000001', pg_catalog.clock_timestamp(),
  null, 'reader-operation'
);

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);

do $reader_test$
declare
  v_record jsonb;
begin
  select pg_catalog.to_jsonb(current_row)
    into v_record
  from public.cloud_records as current_row
  where current_row.workspace_id = '10000000-0000-4000-8000-000000000001'
    and current_row.entity_type = 'products'
    and current_row.record_id = 'reader-only-product';

  if v_record is null then
    raise exception 'The read-only fixture user should be able to read the test record.';
  end if;

  begin
    insert into public.cloud_record_sync_operations (
      workspace_id, operation_id, entity_type, record_id,
      request_signature, record_data, created_by
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      'reader-operation',
      'products',
      'reader-only-product',
      'forged-signature',
      v_record,
      auth.uid()
    );
    raise exception 'Expected read-only ledger insertion to be rejected by RLS.';
  exception
    when insufficient_privilege then null;
  end;
end;
$reader_test$;

reset role;
do $verify_reader_denial$
begin
  if exists (
    select 1
    from public.cloud_record_sync_operations
    where workspace_id = '10000000-0000-4000-8000-000000000001'
      and operation_id = 'reader-operation'
  ) then
    raise exception 'A read-only user forged an operation receipt.';
  end if;
end;
$verify_reader_denial$;

-- The RPC must reject calls without an authenticated identity.
set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '', false);

do $auth_test$
begin
  begin
    perform public.sync_cloud_record_cas(
      '10000000-0000-4000-8000-000000000001',
      'products',
      'unauthenticated-product',
      '{"stock":1}'::jsonb,
      'device-anonymous',
      'unauthenticated-operation',
      null,
      false
    );
    raise exception 'Expected unauthenticated RPC access to be rejected.';
  exception
    when sqlstate '28000' then null;
  end;
end;
$auth_test$;

reset role;
