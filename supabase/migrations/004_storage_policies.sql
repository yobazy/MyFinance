-- MyFinance: Supabase Storage policies for private user uploads
-- You must create a bucket named 'uploads' in the Supabase dashboard first (private).
--
-- This policy allows authenticated users to:
-- - upload files under: <uid>/<upload_id>/<filename>
-- - read/delete their own objects
--
-- NOTE: Workers using the service_role key bypass RLS and can read any object.

-- Preflight: `storage.objects` only exists once Supabase Storage is enabled/provisioned.
-- If you see "relation storage.objects does not exist", go to the Supabase Dashboard:
-- Storage → create any bucket (or enable Storage), then re-run this migration.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise exception
      'Supabase Storage is not provisioned (missing table storage.objects). Enable Storage / create a bucket in the dashboard, then re-run this migration.';
  end if;
end $$;

-- Enable RLS on storage.objects (usually enabled already, but safe to call)
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

