-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mhcncqucrprfkdxpimlh/sql

create table if not exists proposals (
  id bigint primary key,
  title text not null,
  description text not null,
  creator text not null,
  funding_amount numeric not null default 0,
  vote_yes integer not null default 0,
  vote_no integer not null default 0,
  status text not null default 'active',
  end_time bigint not null,
  category text not null,
  ai_score numeric default 0,
  creation_time bigint not null,
  created_at timestamptz default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id bigint not null references proposals(id),
  voter_address text not null,
  vote text not null check (vote in ('for', 'against')),
  tx_id text,
  voted_at timestamptz default now(),
  unique(proposal_id, voter_address)
);

-- Allow public read/write (since app uses anon key)
alter table proposals enable row level security;
alter table votes enable row level security;

create policy "Anyone can read proposals" on proposals for select using (true);
create policy "Anyone can insert proposals" on proposals for insert with check (true);
create policy "Anyone can update proposals" on proposals for update using (true);

create policy "Anyone can read votes" on votes for select using (true);
create policy "Anyone can insert votes" on votes for insert with check (true);
