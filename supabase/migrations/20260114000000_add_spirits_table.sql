-- Migration: Add spirits table for custom user-created spirits
-- Spirits are philosophical/analytical voices that possess the thinking

-- ============================================
-- SPIRITS TABLE
-- Custom spirits created by users
-- ============================================
create table if not exists public.spirits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,

  -- Identity
  slug text not null,
  name text not null,
  source text, -- e.g., "A Lover's Discourse" for Barthes

  -- Visual styling
  color text default '#666666',
  letter_spacing numeric default 0.012,

  -- Detection vocabulary
  resonant_symbols text[] default '{}',
  vocabulary text[] default '{}',
  expanded_vocabulary text[] default '{}',

  -- Categorization
  domains text[] default '{}',
  compatible_with text[] default '{}',
  tensions_with text[] default '{}',

  -- Behavior
  interjection_mode text default 'harmonize'
    check (interjection_mode in ('interrupt', 'harmonize', 'gesture')),

  -- The prompt that defines how this spirit thinks
  prompt_content text not null,

  -- Publishing
  is_public boolean default false,
  is_premium boolean default false,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Unique slug per user (null user_id = system spirit)
  unique(user_id, slug)
);

-- Indexes
create index if not exists spirits_user_id_idx on public.spirits(user_id);
create index if not exists spirits_is_public_idx on public.spirits(is_public) where is_public = true;
create index if not exists spirits_slug_idx on public.spirits(slug);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.spirits enable row level security;

-- Users can view:
-- 1. Their own spirits
-- 2. Public spirits from other users
-- 3. System spirits (user_id is null)
create policy "Users can view own and public spirits"
  on public.spirits for select
  using (
    auth.uid() = user_id
    or is_public = true
    or user_id is null
  );

-- Users can only insert their own spirits
create policy "Users can insert own spirits"
  on public.spirits for insert
  with check (auth.uid() = user_id);

-- Users can only update their own spirits
create policy "Users can update own spirits"
  on public.spirits for update
  using (auth.uid() = user_id);

-- Users can only delete their own spirits
create policy "Users can delete own spirits"
  on public.spirits for delete
  using (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger spirits_updated_at
  before update on public.spirits
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

comment on table public.spirits is 'Custom philosophical spirits that can possess traces';
comment on column public.spirits.slug is 'URL-friendly identifier for the spirit';
comment on column public.spirits.source is 'Origin text or concept the spirit derives from';
comment on column public.spirits.resonant_symbols is 'Transition symbols that trigger this spirit';
comment on column public.spirits.vocabulary is 'Signature vocabulary words for detection';
comment on column public.spirits.expanded_vocabulary is 'Broader semantic field for softer detection';
comment on column public.spirits.domains is 'Domains this spirit excels in (affect, structure, etc.)';
comment on column public.spirits.compatible_with is 'Spirit slugs this works well with';
comment on column public.spirits.tensions_with is 'Spirit slugs this creates productive friction with';
comment on column public.spirits.interjection_mode is 'How this spirit interjects: interrupt, harmonize, or gesture';
comment on column public.spirits.prompt_content is 'The prompt that defines how this spirit thinks and speaks';
comment on column public.spirits.is_public is 'Whether this spirit is visible to other users';
comment on column public.spirits.is_premium is 'Whether this spirit requires premium access';
