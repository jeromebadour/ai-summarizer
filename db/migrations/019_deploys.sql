-- Distill: migration 019. Each deploy is recorded, and the days are public (jeromebadour.com's service board reads
-- them). scripts/deploy.sh records a deploy through the collector (ops/collector.py --deployed), only once the new
-- version is healthy and the public site answers, so a failed deploy is never counted. The collector's role can add a
-- deploy and nothing else; anyone can read the days and the live commit, and nothing more.

create table if not exists deploys (
  id          bigint generated always as identity primary key,
  deployed_at timestamptz not null default now(),
  commit      text not null check (commit ~ '^[0-9a-f]{7,40}$')
);
create index if not exists deploys_at on deploys (deployed_at);
revoke all on deploys from public;

create or replace function record_deploy(p_commit text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_commit !~ '^[0-9a-f]{7,40}$' then raise exception 'collector: not a commit: %', p_commit; end if;
  insert into deploys (commit) values (left(p_commit, 7));
end $$;
revoke execute on function record_deploy(text) from public;
grant execute on function record_deploy(text) to distill_collector;

-- The public feed: the first deploy's day, every day with a deploy (UTC, oldest first, each once) and the latest
-- deploy's commit. Nothing about who deployed or what changed.
create or replace function public_deploys() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'live_since', (select to_char(min(deployed_at) at time zone 'UTC', 'YYYY-MM-DD') from deploys),
    'deploys',    (select coalesce(jsonb_agg(d order by d), '[]')
                   from (select distinct to_char(deployed_at at time zone 'UTC', 'YYYY-MM-DD') as d from deploys) days),
    'commit',     (select commit from deploys order by deployed_at desc, id desc limit 1)
  )
$$;
revoke execute on function public_deploys() from public;
grant execute on function public_deploys() to distill_app;
