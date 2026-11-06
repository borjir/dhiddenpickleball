-- Payment proofs are the only files this project writes to Supabase Storage.
-- Keep them well below the 1 GB free-plan allowance: the browser compresses
-- screenshots before upload, and the bucket enforces the final 2 MB ceiling.

update storage.buckets
set
  file_size_limit = 2097152,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
where id = 'payment-proofs';
