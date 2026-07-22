ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS cleanup_batch uuid;

CREATE INDEX IF NOT EXISTS inventory_status_idx ON public.inventory (status);

SELECT pg_notify('pgrst', 'reload schema');