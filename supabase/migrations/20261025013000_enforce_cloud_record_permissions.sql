-- Enforce role permissions on generic cloud records. Unknown record types default to owner-only.
create or replace function public.required_workspace_permission(target_entity text, operation text)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when lower(target_entity) in ('sales','sale','sales_history','sales-history','invoice','invoices','receipt','receipts','pos_sales','pos-sales')
      then case operation when 'read' then 'sales.view' when 'insert' then 'sales.create' else 'sales.edit' end
    when lower(target_entity) in ('products','product','product_catalog','product-catalog','categories','category')
      then case operation when 'read' then 'products.view' when 'insert' then 'products.create' else 'products.edit' end
    when lower(target_entity) in ('inventory','stock','stock_movement','stock-movement','inventory_count','inventory-count')
      then case operation when 'read' then 'products.view' else 'inventory.adjust' end
    when lower(target_entity) in ('purchases','purchase','purchase_history','purchase-history','orders','order')
      then case operation when 'read' then 'purchases.view' when 'insert' then 'purchases.create' else 'purchases.confirm' end
    when lower(target_entity) in ('customers','customer','customer_accounts','customer-accounts')
      then case operation when 'read' then 'customers.view' else 'customers.manage' end
    when lower(target_entity) in ('suppliers','supplier','supplier_accounts','supplier-accounts')
      then 'suppliers.manage'
    when lower(target_entity) in ('cash','cash_register','cash-register','cash_transactions','cash-transactions','cash_movements','cash-movements')
      then case operation when 'read' then 'cash.view' when 'insert' then 'cash.open_close' else 'cash.adjust' end
    when lower(target_entity) in ('reports','report','statistics','analytics')
      then case operation when 'read' then 'reports.sales.view' else 'reports.export' end
    when lower(target_entity) in ('employees','employee_profiles','workspace_members')
      then case operation when 'read' then 'employees.view' else 'employees.manage' end
    when lower(target_entity) in ('roles','permissions','workspace_roles')
      then 'roles.manage'
    else 'workspace.records.manage'
  end;
$$;

drop policy if exists "Workspace members can read records" on public.cloud_records;
create policy "Workspace members can read permitted records" on public.cloud_records
  for select to authenticated using (
    public.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'read')
    )
  );

drop policy if exists "Workspace members can insert records" on public.cloud_records;
create policy "Members can insert permitted records" on public.cloud_records
  for insert to authenticated with check (
    public.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
    and public.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'insert')
    )
  );

drop policy if exists "Workspace members can update records" on public.cloud_records;
create policy "Members can update permitted records" on public.cloud_records
  for update to authenticated using (
    public.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'update')
    )
  ) with check (
    public.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
    and public.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'update')
    )
  );
