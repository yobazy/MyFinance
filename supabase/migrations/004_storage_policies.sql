-- MyFinance: Supabase Storage policies for private user uploads
-- You must create a bucket named 'uploads' in the Supabase dashboard first (private).
--
-- This policy allows authenticated users to:
-- - upload files under: <uid>/<upload_id>/<filename>
-- - read/delete their own objects
--
-- NOTE: Workers using the service_role key bypass RLS and can read any object.

-- Enable RLS on storage.objects (usually enabled, but safe to call)
alter table storage.objects enable row level security;

-- Create policies (ignore duplicates if you re-run)
do $$
begin
  execute $p$
    create policy "uploads_bucket_user_can_write_own_prefix"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'uploads'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $p$;

  execute $p$
    create policy "uploads_bucket_user_can_read_own_prefix"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'uploads'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $p$;

  execute $p$
    create policy "uploads_bucket_user_can_delete_own_prefix"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'uploads'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $p$;
exception
  when duplicate_object then
    null;
end $$;

