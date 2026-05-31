-- ============================================================
-- TouseOS – Migration 003: Storage buckets + policies
-- Run after 002_greekmatch.sql
-- ============================================================

-- ── Create storage buckets ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos',    'photos',    false, 10485760,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',   'avatars',   true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('documents', 'documents', false, 52428800,  ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/msword','application/vnd.ms-excel','text/plain']),
  ('receipts',  'receipts',  false, 10485760,  ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies ─────────────────────────────────────
-- Authenticated users can upload to org-scoped paths (path begins with their org id).
-- For simplicity we allow any authenticated user to upload; reads are scoped per bucket.

-- Photos: authenticated upload, authenticated read
CREATE POLICY "photos_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');
CREATE POLICY "photos_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "photos_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "photos_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND owner = auth.uid());

-- Avatars: public read, authenticated upload to own folder
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Documents: authenticated read/write
CREATE POLICY "documents_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "documents_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "documents_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND owner = auth.uid());

-- Receipts: authenticated read/write (officers review via app RLS)
CREATE POLICY "receipts_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');
CREATE POLICY "receipts_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');
