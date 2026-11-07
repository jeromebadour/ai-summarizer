-- Distill: migration 010. The About page's live numbers: totals only, nobody's data, for anyone (signed in or not).
create or replace function public_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'summaries', (select count(*) from usage_events where recorded and not refunded),
    'words',     (select coalesce(sum(words), 0) from usage_events where recorded and not refunded),
    'figures',   (select coalesce(sum(jsonb_array_length(figures)), 0) from summaries),
    'accounts',  (select count(*) from users where role <> 'guest'),
    'since',     (select min(created_at) from users)
  )
$$;
revoke execute on function public_stats() from public;
grant execute on function public_stats() to distill_app;
