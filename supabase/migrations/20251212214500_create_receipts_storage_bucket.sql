-- migration: create receipts storage bucket
-- purpose: enables users to upload receipt images for ai processing
-- affected: storage.buckets, storage.objects
-- considerations: rls policies ensure users can only access their own receipts

-- create receipts bucket for storing receipt images
insert into storage.buckets (id, name)
values (
  'receipts',
  'receipts'
)
on conflict (id) do nothing;

-- rls policy: allow authenticated users to upload receipts to their own folder
create policy "users can upload receipts to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts' and
  (storage.foldername(name))[1] = 'receipts' and
  (storage.foldername(name))[2] = auth.uid()::text
);

-- rls policy: allow authenticated users to read their own receipts
create policy "users can read their own receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts' and
  (storage.foldername(name))[1] = 'receipts' and
  (storage.foldername(name))[2] = auth.uid()::text
);

-- rls policy: allow authenticated users to delete their own receipts
create policy "users can delete their own receipts"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts' and
  (storage.foldername(name))[1] = 'receipts' and
  (storage.foldername(name))[2] = auth.uid()::text
);