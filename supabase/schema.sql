-- SQL schema for Brain Tumor Detection System

-- 1. Create table scan_records
create table if not exists public.scan_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  image_path text not null,
  prediction_label text not null,
  confidence numeric(5,4) not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.scan_records enable row level security;

-- Drop policies if they exist and recreate
drop policy if exists "Users can view their own records" on public.scan_records;
drop policy if exists "Users can insert their own records" on public.scan_records;
drop policy if exists "Users can delete their own records" on public.scan_records;

-- Create policies
create policy "Users can view their own records"
  on public.scan_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own records"
  on public.scan_records for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own records"
  on public.scan_records for delete
  using (auth.uid() = user_id);

-- 2. Storage Bucket Policy (Note: Supabase Storage is schema-based, run this or set up via UI)
-- Bucket: brain-scans (ensure it is created as private)
-- Policy to allow select/insert/delete for authenticated users in their own user_id directory
--
-- Policy for select: auth.uid()::text = (storage.foldername(name))[1]
-- Policy for insert: auth.uid()::text = (storage.foldername(name))[1]
-- Policy for delete: auth.uid()::text = (storage.foldername(name))[1]
