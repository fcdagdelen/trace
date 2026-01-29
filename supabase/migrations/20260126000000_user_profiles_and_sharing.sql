-- Migration: User profiles and trace sharing
-- Adds user tier system and public sharing for traces

-- ============================================
-- USER_PROFILES TABLE
-- User tier and subscription information
-- ============================================
create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  tier text default 'free' check (tier in ('free', 'paid', 'pro')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for user lookups
create index if not exists user_profiles_user_id_idx on public.user_profiles(user_id);

-- ============================================
-- TRACES TABLE MODIFICATIONS
-- Add sharing capabilities
-- ============================================
alter table public.traces add column if not exists is_public boolean default false;
alter table public.traces add column if not exists share_slug text unique;

-- Index for public trace lookups by slug
create index if not exists traces_share_slug_idx on public.traces(share_slug) where share_slug is not null;
create index if not exists traces_is_public_idx on public.traces(is_public) where is_public = true;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on user_profiles
alter table public.user_profiles enable row level security;

-- User profiles: users can only see and modify their own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- Update traces policy to allow public viewing
-- First drop the existing select policy
drop policy if exists "Users can view own traces" on public.traces;

-- Recreate with public trace support
create policy "Users can view own traces or public traces"
  on public.traces for select
  using (
    auth.uid() = user_id
    or is_public = true
  );

-- Update trace_lines policy for public traces
drop policy if exists "Users can view lines of own traces" on public.trace_lines;

create policy "Users can view lines of own or public traces"
  on public.trace_lines for select
  using (
    exists (
      select 1 from public.traces
      where traces.id = trace_lines.trace_id
      and (traces.user_id = auth.uid() or traces.is_public = true)
    )
  );

-- ============================================
-- FUNCTION: Auto-create user profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, tier)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists update_user_profiles_updated_at on public.user_profiles;
create trigger update_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
comment on table public.user_profiles is 'User profile and tier information';
comment on column public.user_profiles.tier is 'Subscription tier: free, paid, or pro';
comment on column public.traces.is_public is 'Whether the trace is publicly accessible';
comment on column public.traces.share_slug is 'Unique slug for public sharing URL';
