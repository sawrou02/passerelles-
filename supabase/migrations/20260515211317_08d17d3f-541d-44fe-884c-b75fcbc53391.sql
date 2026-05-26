ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS hidden_for uuid[] NOT NULL DEFAULT '{}';