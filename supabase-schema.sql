-- SnapFlow Supabase Schema
-- This file contains the SQL schema for SnapFlow's Supabase database
--
-- SETUP INSTRUCTIONS:
-- 1. Copy and run this entire SQL file in your Supabase SQL Editor
-- 2. Go to Storage section in Supabase Dashboard
-- 3. Create a new bucket named 'snapflow-public-bucket' with these settings:
--    - Public: Yes
--    - File size limit: 52428800 (50MB)
--    - Allowed MIME types: image/png, image/jpeg, image/jpg, image/gif,
--                          image/webp, video/mp4, video/webm, video/quicktime
-- 4. The storage policies below will be applied automatically when you run this schema

-- Create issues table to sync local data to cloud
CREATE TABLE IF NOT EXISTS public.issues (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('screenshot', 'recording')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  cloud_file_url TEXT,
  cloud_thumbnail_url TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('local', 'synced', 'syncing', 'failed')),
  synced_to JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON public.issues(user_id);

-- Create index on timestamp for sorting
CREATE INDEX IF NOT EXISTS idx_issues_timestamp ON public.issues(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own issues
CREATE POLICY "Users can view their own issues"
  ON public.issues
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own issues
CREATE POLICY "Users can insert their own issues"
  ON public.issues
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own issues
CREATE POLICY "Users can update their own issues"
  ON public.issues
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own issues
CREATE POLICY "Users can delete their own issues"
  ON public.issues
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create sync_history table to track sync operations
CREATE TABLE IF NOT EXISTS public.sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('push', 'pull', 'full')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON public.sync_history(user_id);

-- Create index on started_at for sorting
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON public.sync_history(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own sync history
CREATE POLICY "Users can view their own sync history"
  ON public.sync_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own sync history
CREATE POLICY "Users can insert their own sync history"
  ON public.sync_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own sync history
CREATE POLICY "Users can update their own sync history"
  ON public.sync_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ==========================================
-- STORAGE BUCKET CONFIGURATION
-- ==========================================
-- NOTE: The storage bucket 'snapflow-public-bucket' must be created manually
-- in the Supabase Dashboard under Storage with the following settings:
--   - Name: snapflow-public-bucket
--   - Public: Yes
--   - File size limit: 52428800 (50MB)
--   - Allowed MIME types: image/png, image/jpeg, image/jpg, image/gif, image/webp, video/mp4, video/webm, video/quicktime

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own files
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'snapflow-public-bucket'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'snapflow-public-bucket'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'snapflow-public-bucket'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Everyone can read files from public bucket (since bucket is public)
CREATE POLICY "Public files are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'snapflow-public-bucket');
