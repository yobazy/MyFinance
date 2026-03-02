-- MyFinance: Make storage_path nullable in uploads table
-- Files are now processed directly without storing in Supabase Storage

alter table public.uploads
  alter column storage_path drop not null;
