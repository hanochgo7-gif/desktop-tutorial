-- 003: the data export also includes the account itself (security review S-08 (c)).
-- lucid_export() runs as the learner (security invoker), who cannot read auth.users. A narrow SECURITY DEFINER
-- helper returns only the caller's own email and sign-up/sign-in dates; it takes no arguments, so it cannot be
-- pointed at another account.
create or replace function public.lucid_account_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
  from auth.users u where u.id = auth.uid();
$$;
revoke all on function public.lucid_account_info() from public, anon, authenticated;
grant execute on function public.lucid_account_info() to authenticated;

create or replace function public.lucid_export() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', public.lucid_account_info(),
    'profile', (select to_jsonb(p) from public.lucid_profiles p where p.id = auth.uid()),
    'records', coalesce((select jsonb_agg(jsonb_build_object('coll', r.coll, 'id', r.id, 'data', r.data, 'deleted', r.deleted, 'updated_at', r.updated_at) order by r.coll, r.id)
                         from public.lucid_records r where r.user_id = auth.uid()), '[]'::jsonb),
    'ai_usage', coalesce((select jsonb_agg(jsonb_build_object('route', u.route, 'units', u.units, 'outcome', u.outcome,
                                                              'input_tokens', u.input_tokens, 'output_tokens', u.output_tokens, 'created_at', u.created_at) order by u.created_at)
                          from public.lucid_ai_usage u where u.user_id = auth.uid()), '[]'::jsonb)
  );
$$;
