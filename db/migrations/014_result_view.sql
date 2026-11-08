-- How a finished summary is laid out: source and summary side by side ("split", the default), or one centred column
-- with each point's source sentences quoted under it ("column"). Each person changes only their own (row-level security).
create type result_view as enum ('split', 'column');
alter table users add column result_view result_view not null default 'split';
grant update (result_view) on users to distill_app;
