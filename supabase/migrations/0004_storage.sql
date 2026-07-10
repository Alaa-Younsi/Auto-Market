-- Storage bucket for product images. Public read, authenticated write.
-- If the bucket already exists (created via dashboard), this is a no-op.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_bucket_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

create policy "product_images_bucket_authenticated_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_bucket_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

create policy "product_images_bucket_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
