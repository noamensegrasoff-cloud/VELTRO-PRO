-- Reconcile the live database with the intended permission rules in
-- 20261102022741_harden_workspace_permissions.sql.
-- The original migration was applied before its source was finalized, leaving
-- the live function and employee profile policies out of sync with GitHub.
begin;

create or replace function public.required_workspace_permission(
  target_entity text,
  operation text,
  target_record text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(target_entity) in ('sales','sale','sales_history','sales-history','invoice','invoices','receipt','receipts','pos_sales','pos-sales','sales_invoices','sales-invoice','sales-invoices')
      then case operation when 'read' then 'sales.view' when 'insert' then 'sales.create' else 'sales.edit' end
    when lower(target_entity) in ('products','product','product_catalog','product-catalog','categories','category')
      then case operation when 'read' then 'products.view' when 'insert' then 'products.create' else 'products.edit' end
    when lower(target_entity) in ('inventory','stock','stock_movement','stock-movement','inventory_count','inventory-count','product_movements','product-movements')
      then case operation when 'read' then 'products.view' else 'inventory.adjust' end
    when lower(target_entity) in ('purchases','purchase','purchase_history','purchase-history','orders','order','purchase_receipts','purchase-receipts','purchase_invoices','purchase-invoices')
      then case operation when 'read' then 'purchases.view' when 'insert' then 'purchases.create' else 'purchases.confirm' end
    when lower(target_entity) in ('customers','customer','customer_accounts','customer-accounts')
      then case operation when 'read' then 'customers.view' else 'customers.manage' end
    when lower(target_entity) in ('suppliers','supplier','supplier_accounts','supplier-accounts')
      then 'suppliers.manage'
    when lower(target_entity) in ('cash','cash_register','cash-register','cash_transactions','cash-transactions','cash_movements','cash-movements')
      then case operation when 'read' then 'cash.view' else 'cash.open_close' end
    when lower(target_entity) in ('reports','report','statistics','analytics')
      then case operation when 'read' then 'reports.sales.view' else 'reports.export' end
    when lower(target_entity) in ('employees','employee_profiles','workspace_members')
      then case operation when 'read' then 'employees.view' else 'employees.manage' end
    when lower(target_entity) in ('roles','permissions','workspace_roles')
      then 'roles.manage'
    when lower(target_entity) = 'local_storage' then
      case
        when lower(coalesce(target_record, '')) ~ '(customer[._-]?transactions|customer-transactions)' then
          case operation when 'read' then 'customers.debts.view' when 'insert' then 'sales.create' else 'sales.edit' end
        when lower(coalesce(target_record, '')) ~ '(sales|sale|pos|held)' then
          case operation when 'read' then 'sales.view' when 'insert' then 'sales.create' else 'sales.edit' end
        when lower(coalesce(target_record, '')) ~ '(purchase|purchases|order)' then
          case operation when 'read' then 'purchases.view' when 'insert' then 'purchases.create' else 'purchases.confirm' end
        when lower(coalesce(target_record, '')) ~ '(supplier|suppliers)' then 'suppliers.manage'
        when lower(coalesce(target_record, '')) ~ '(stock|movement|inventory)' then
          case operation when 'read' then 'products.view' else 'inventory.adjust' end
        when lower(coalesce(target_record, '')) ~ '(product|products|catalog|barcode|category)' then
          case operation when 'read' then 'products.view' when 'insert' then 'products.create' else 'products.edit' end
        when lower(coalesce(target_record, '')) ~ '(customer|customers)' then
          case operation when 'read' then 'customers.view' else 'customers.manage' end
        when lower(coalesce(target_record, '')) ~ '(expense|income)' then
          case operation when 'read' then 'cash.view' else 'cash.expense.create' end
        when lower(coalesce(target_record, '')) ~ '(cash|payment)' then
          case operation when 'read' then 'cash.view' else 'cash.open_close' end
        when lower(coalesce(target_record, '')) ~ '(report|reports|statistics|analytics)' then
          case operation when 'read' then 'reports.sales.view' else 'reports.export' end
        when lower(coalesce(target_record, '')) ~ '(dashboard)' then 'dashboard.view'
        else 'workspace.records.manage'
      end
    else 'workspace.records.manage'
  end;
$$;

revoke all on function public.required_workspace_permission(text, text, text) from public, anon;
grant execute on function public.required_workspace_permission(text, text, text) to authenticated;

drop policy if exists "Owners create employee profiles" on public.employee_profiles;
drop policy if exists "Owners update employee profiles" on public.employee_profiles;
drop policy if exists "Owners delete employee profiles" on public.employee_profiles;

create policy "Authorized users create employee profiles"
on public.employee_profiles for insert to authenticated
with check (private.has_workspace_permission(workspace_id, 'employees.manage'));

create policy "Authorized users update employee profiles"
on public.employee_profiles for update to authenticated
using (private.has_workspace_permission(workspace_id, 'employees.manage'))
with check (private.has_workspace_permission(workspace_id, 'employees.manage'));

create policy "Authorized users delete employee profiles"
on public.employee_profiles for delete to authenticated
using (private.has_workspace_permission(workspace_id, 'employees.manage'));

commit;
