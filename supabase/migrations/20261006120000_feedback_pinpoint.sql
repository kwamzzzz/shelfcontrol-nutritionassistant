-- Feedback that says exactly where, and a lifecycle for working on it.
--
-- `screen` is the human name of the screen the sender was on ("Shopping
-- List", "Recipe: Jollof Rice"). `target` is the thing they pointed at: its
-- readable name, a selector to find it again, and where it sat on their
-- screen. `context` is what they would never think to type: window and
-- screen size, browser, the screens visited just before, recent errors.
--
-- Statuses become a working lifecycle: new -> in_progress -> done, or
-- wont_do. `admin_notes` remains the reply the sender sees.
--
-- What the sender wrote and the evidence captured with it cannot be changed
-- by anyone afterwards; an admin may only move the status and reply.

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_status_valid;

UPDATE public.feedback SET status = 'in_progress' WHERE status = 'reviewed';
UPDATE public.feedback SET status = 'done' WHERE status = 'resolved';

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_status_valid
    CHECK (status IN ('new', 'in_progress', 'done', 'wont_do')),
  ADD COLUMN IF NOT EXISTS screen text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target jsonb,
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE OR REPLACE FUNCTION public.feedback_status_and_reply_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.page_path IS DISTINCT FROM OLD.page_path
     OR NEW.screen IS DISTINCT FROM OLD.screen
     OR NEW.target IS DISTINCT FROM OLD.target
     OR NEW.context IS DISTINCT FROM OLD.context
     OR NEW.screenshot_path IS DISTINCT FROM OLD.screenshot_path
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the status and reply of feedback can be changed';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    NEW.replied_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_status_and_reply_only ON public.feedback;
CREATE TRIGGER feedback_status_and_reply_only
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.feedback_status_and_reply_only();
