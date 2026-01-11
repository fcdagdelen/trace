-- Initial schema migration for Trace
-- Tables: traces, trace_lines, trace_injections

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- TRACES TABLE
-- Main trace records
-- ============================================
create table if not exists public.traces (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  query text not null,
  method_ids text[] not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  total_duration_ms integer,
  line_count integer,
  symbol_count integer,
  dominant_method text,
  tension_score numeric,
  depth_range int4range
);

-- Index for user lookups
create index if not exists traces_user_id_idx on public.traces(user_id);
create index if not exists traces_created_at_idx on public.traces(created_at desc);

-- ============================================
-- TRACE_LINES TABLE
-- Individual lines in a trace
-- ============================================
create table if not exists public.trace_lines (
  id uuid primary key default uuid_generate_v4(),
  trace_id uuid references public.traces(id) on delete cascade,
  sequence integer not null,
  content text not null,
  is_symbol boolean default false,
  method_hint text,
  depth integer,
  relative_time_ms integer,
  typing_duration_ms integer,
  metadata jsonb
);

-- Index for trace lookups (with sequence ordering)
create index if not exists trace_lines_trace_id_seq_idx on public.trace_lines(trace_id, sequence);

-- ============================================
-- TRACE_INJECTIONS TABLE
-- Mid-stream user injections
-- ============================================
create table if not exists public.trace_injections (
  id uuid primary key default uuid_generate_v4(),
  trace_id uuid references public.traces(id) on delete cascade,
  content text not null,
  after_line_sequence integer,
  injected_at timestamptz default now()
);

-- Index for trace lookups
create index if not exists trace_injections_trace_id_idx on public.trace_injections(trace_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.traces enable row level security;
alter table public.trace_lines enable row level security;
alter table public.trace_injections enable row level security;

-- Traces: users can only see their own traces
create policy "Users can view own traces"
  on public.traces for select
  using (auth.uid() = user_id);

create policy "Users can insert own traces"
  on public.traces for insert
  with check (auth.uid() = user_id);

create policy "Users can update own traces"
  on public.traces for update
  using (auth.uid() = user_id);

create policy "Users can delete own traces"
  on public.traces for delete
  using (auth.uid() = user_id);

-- Trace lines: users can access lines for their own traces
create policy "Users can view lines of own traces"
  on public.trace_lines for select
  using (
    exists (
      select 1 from public.traces
      where traces.id = trace_lines.trace_id
      and traces.user_id = auth.uid()
    )
  );

create policy "Users can insert lines for own traces"
  on public.trace_lines for insert
  with check (
    exists (
      select 1 from public.traces
      where traces.id = trace_lines.trace_id
      and traces.user_id = auth.uid()
    )
  );

-- Trace injections: users can access injections for their own traces
create policy "Users can view injections of own traces"
  on public.trace_injections for select
  using (
    exists (
      select 1 from public.traces
      where traces.id = trace_injections.trace_id
      and traces.user_id = auth.uid()
    )
  );

create policy "Users can insert injections for own traces"
  on public.trace_injections for insert
  with check (
    exists (
      select 1 from public.traces
      where traces.id = trace_injections.trace_id
      and traces.user_id = auth.uid()
    )
  );

-- ============================================
-- COMMENTS
-- ============================================
comment on table public.traces is 'Main trace records - philosophical thinking sessions';
comment on table public.trace_lines is 'Individual lines of output in a trace';
comment on table public.trace_injections is 'User injections made mid-stream during a trace';
comment on column public.traces.method_ids is 'Array of philosophical method IDs that possessed the trace';
comment on column public.traces.dominant_method is 'The most frequently detected method in the trace';
comment on column public.traces.tension_score is 'Measure of productive tension between methods';
comment on column public.trace_lines.method_hint is 'Detected method active for this line based on vocabulary';
comment on column public.trace_lines.depth is 'Semantic depth level (0-4) based on symbol transitions';
comment on column public.trace_lines.metadata is 'JSON metadata: tension, depth vectors, convergence, transitions';
