// Generated from replica/schema.sql. Keep the two in sync (the test suite checks).
export default String.raw`-- Tern server schema. Postgres 14+. All times UTC (timestamptz).
-- gen_random_uuid() is built into Postgres 13+.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null,
  name text not null default '',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('google', 'mcp')),
  provider text not null,                 -- gmail | calendar | drive | <slug of custom app>
  name text not null,
  url text,                               -- MCP endpoint
  auth_type text not null default 'none' check (auth_type in ('none', 'bearer', 'oauth', 'google')),
  scopes text not null default '',
  secret_enc text,                        -- encrypted JSON: tokens, client registration
  expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'needs_auth', 'expired', 'error')),
  tools_cache jsonb,
  settings jsonb not null default '{}',             -- e.g. {"enabled": ["gmail","calendar"]}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
create index if not exists connections_user_idx on connections(user_id);

create table if not exists pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  state_enc text not null,                -- encrypted agent turn state
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour'
);
create index if not exists pending_user_idx on pending_actions(user_id);
create index if not exists pending_expires_idx on pending_actions(expires_at);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  prompt text not null check (length(prompt) between 1 and 4000),
  schedule jsonb not null,                -- {freq: once|hourly|daily|weekdays|weekly, time: "07:00", days: [1..7], at: iso}
  timezone text not null default 'UTC',
  deliver_email boolean not null default true,
  can_act boolean not null default false,
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_status text check (last_status in ('ok', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on tasks(user_id);
create index if not exists tasks_due_idx on tasks(next_run_at) where enabled;

create table if not exists task_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('running', 'ok', 'error')),
  output text not null default '',
  steps jsonb not null default '[]',
  emailed boolean not null default false,
  read boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists runs_task_idx on task_runs(task_id, started_at desc);
create index if not exists runs_user_idx on task_runs(user_id, read);

-- Access rule: every query in api/_lib/store.js filters by user_id taken from the signed session.
`;
