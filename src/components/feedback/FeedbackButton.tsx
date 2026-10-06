import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import FeedbackDialog from "./FeedbackDialog";
import { listenForErrors, recordVisit, screenFor } from "@/lib/feedback-capture";
import { cn } from "@/lib/utils";

/**
 * The header's feedback button, on every screen. It also keeps, quietly, the
 * screens the sender came through and any errors the app hit, so a report
 * shows how they got where they are.
 */
const FeedbackButton = ({ compact = false }: { compact?: boolean }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => listenForErrors(), []);
  useEffect(() => recordVisit(pathname, screenFor(pathname)), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback on this screen"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-full glass-card glass-card-hover text-sm font-medium text-foreground",
          compact ? "w-10" : "px-4",
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        {!compact && <span>Feedback</span>}
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FeedbackButton;
