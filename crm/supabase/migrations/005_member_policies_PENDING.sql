-- PENDING (needs the owner's approval in Supabase because it replaces a policy):
-- admins may manage members but never change or remove an owner.
drop policy if exists mem_admin on public.crm_members;
create policy mem_insert on public.crm_members for insert to authenticated with check (public.crm_is_admin(workspace_id) and role <> 'owner');
create policy mem_update on public.crm_members for update to authenticated using (public.crm_is_admin(workspace_id) and role <> 'owner') with check (public.crm_is_admin(workspace_id) and role <> 'owner');
create policy mem_delete on public.crm_members for delete to authenticated using (public.crm_is_admin(workspace_id) and role <> 'owner');
