-- Migration: Transform thematic diaries into personal journals
-- Adds new columns while keeping existing ones for retrocompatibility

-- Add title column (free-form diary name)
ALTER TABLE public.thematic_diaries
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add entries column (jsonb array of journal entries: { id, text, created_at })
ALTER TABLE public.thematic_diaries
ADD COLUMN IF NOT EXISTS entries JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add color column (user-chosen color)
ALTER TABLE public.thematic_diaries
ADD COLUMN IF NOT EXISTS color TEXT;

-- Add icon column (user-chosen emoji)
ALTER TABLE public.thematic_diaries
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Verify RLS is enabled (idempotent)
ALTER TABLE public.thematic_diaries ENABLE ROW LEVEL SECURITY;

-- RLS policies already exist from original migration:
--   "Users can view their own diaries"   (SELECT, auth.uid() = user_id)
--   "Users can insert their own diaries" (INSERT, auth.uid() = user_id)
--   "Users can update their own diaries" (UPDATE, auth.uid() = user_id)
--   "Users can delete their own diaries" (DELETE, auth.uid() = user_id)
-- No changes needed — owner-only access is already enforced.
