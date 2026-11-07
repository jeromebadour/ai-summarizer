-- Distill: migration 009. How a summary shows its links to the source: 'always' draws every point's threads at once
-- (the default), 'hover' only the point under the mouse. A preference like theme and motion, saved to the account.
create type link_mode as enum ('always', 'hover');
alter table users add column links link_mode not null default 'always';
grant update (links) on users to distill_app;
