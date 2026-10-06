import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageSquare, Star, Loader2, Crosshair, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import FeedbackPicker from "./FeedbackPicker";
import { useSubmitFeedback, type FeedbackCategory } from "@/hooks/useFeedback";
import {
  captureCanvas, gatherContext, markScreen, pageHeading, screenFor, type FeedbackTarget,
} from "@/lib/feedback-capture";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ElementType }[] = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "idea", label: "Idea", icon: Lightbulb },
  { value: "general", label: "General", icon: MessageSquare },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Feedback on the screen the sender is looking at. The dialog is named after
 * that screen; "Point at it" hides the dialog and lets them pick the exact
 * button, card or area; the screen goes with it as a picture (their pick
 * circled) unless they untick it, along with the context they would never
 * think to type. They can see all of it before sending.
 */
const FeedbackDialog = ({ open, onOpenChange }: Props) => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const submit = useSubmitFeedback();

  const [screen, setScreen] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [expected, setExpected] = useState("");
  const [target, setTarget] = useState<FeedbackTarget | null>(null);
  const [picking, setPicking] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [attachShot, setAttachShot] = useState(true);

  // One picture of the screen, started the moment the dialog opens so it is
  // usually ready before the sender has finished typing. Picks only draw on it.
  const capture = useRef<{ scrollY: number; canvas: Promise<HTMLCanvasElement | null> } | null>(null);
  const targetRef = useRef<FeedbackTarget | null>(null);
  targetRef.current = target;

  const startCapture = () => {
    const pending = { scrollY: window.scrollY, canvas: captureCanvas() };
    capture.current = pending;
    void pending.canvas.then((canvas) => {
      if (capture.current === pending && canvas) setShot(markScreen(canvas, targetRef.current));
    });
  };

  // The screen is named, and pictured, as it stands when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setScreen(screenFor(pathname, pageHeading()));
    startCapture();
  }, [open, pathname]);

  const reset = () => {
    setCategory("bug");
    setRating(null);
    setMessage("");
    setExpected("");
    setTarget(null);
    setShot(null);
    setAttachShot(true);
    capture.current = null;
  };

  const close = () => {
    if (submit.isPending) return;
    reset();
    onOpenChange(false);
  };

  /** The part picked, ringed on the picture (taken again if the page was scrolled). */
  const picked = (t: FeedbackTarget) => {
    setPicking(false);
    setTarget(t);
    targetRef.current = t;
    if (!capture.current || capture.current.scrollY !== window.scrollY) {
      setShot(null);
      startCapture();
      return;
    }
    const pending = capture.current;
    void pending.canvas.then((canvas) => {
      if (capture.current === pending && canvas) setShot(markScreen(canvas, t));
    });
  };

  const composed = [
    message.trim(),
    expected.trim() ? `What it should do instead: ${expected.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const remaining = MAX_LENGTH - composed.length;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 4) {
      toast.error("Please tell us a little more (at least 4 characters).");
      return;
    }
    if (remaining < 0) {
      toast.error(`Please keep feedback under ${MAX_LENGTH} characters.`);
      return;
    }
    // Sending never waits for the picture: it follows on its own once drawn.
    const pending = capture.current;
    const picture =
      attachShot && pending
        ? pending.canvas.then((canvas) => (canvas ? markScreen(canvas, target) : null))
        : null;
    try {
      await submit.mutateAsync({
        category,
        rating,
        message: composed,
        page_path: pathname + search,
        screen,
        target,
        context: gatherContext(),
        screenshot: picture,
      });
      toast.success("Thanks, your feedback has been sent.", {
        action: { label: "See your feedback", onClick: () => navigate("/feedback") },
      });
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      // The dialog stays open with the text intact.
      const reason =
        err instanceof Error ? err.message : (err as { message?: string })?.message;
      toast.error(reason ? `That didn't send: ${reason}` : "That didn't send. Please try again.");
    }
  };

  const context = open ? gatherContext() : null;

  return (
    <>
      <Dialog open={open && !picking} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
        <DialogContent
          data-feedback-ui
          overlayProps={{ "data-feedback-ui": "" }}
          className="overflow-x-hidden sm:max-w-lg [&>*]:min-w-0"
        >
          <DialogHeader>
            <DialogTitle>Feedback on {screen}</DialogTitle>
            <DialogDescription className="break-all font-mono text-[11px]">
              {pathname + search}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={send} className="min-w-0 space-y-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kind of feedback">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                    category === c.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <c.icon className="h-4 w-4" />
                  {c.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Which part of the screen</Label>
              {target ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#FF5A25]/40 bg-[#FF5A25]/5 px-3 py-2 text-sm">
                  <Crosshair className="h-4 w-4 shrink-0 text-[#FF5A25]" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{target.label}</span>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                    onClick={() => setPicking(true)}
                  >
                    Point again
                  </button>
                  <button
                    type="button"
                    aria-label="Clear what was pointed at"
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setTarget(null);
                      setShot(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex w-full items-start gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">Point at it</span>
                    <span className="block text-xs text-muted-foreground">
                      Tap the button, card or area you mean, or drag a box around it
                    </span>
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">
                {category === "idea" ? "What would you change" : "What happened"}
              </Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={
                  category === "idea"
                    ? "Describe the change you'd like to see here."
                    : "What you did, and what the screen did in response."
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-expected">What it should do instead (optional)</Label>
              <Textarea
                id="feedback-expected"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={2}
                placeholder="The behaviour or wording you expected."
              />
              {remaining < 200 && (
                <p className={cn("text-right text-[11px]", remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                  {remaining} characters left
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>How would you rate this screen? (optional)</Label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="rounded-md p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        rating && n <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/50",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  checked={attachShot}
                  onCheckedChange={(v) => setAttachShot(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="block font-medium text-foreground">Attach a picture of the screen</span>
                  <span className="block text-xs text-muted-foreground">
                    {target
                      ? "With what you pointed at circled. Untick it if anything on screen is private."
                      : "Of the screen behind this dialog. Untick it if anything on screen is private."}
                  </span>
                </span>
              </label>
              {attachShot && shot && (
                <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border">
                  <img
                    src={shot}
                    alt="What will be sent"
                    className="block h-auto w-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {context && (
              <details className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">Also sent automatically</summary>
                <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                  <dt>Screen</dt>
                  <dd className="text-foreground">{screen}</dd>
                  <dt>Window</dt>
                  <dd className="text-foreground">
                    {context.window.width} × {context.window.height} on a {context.screen.width} ×{" "}
                    {context.screen.height} screen
                  </dd>
                  <dt>Browser</dt>
                  <dd className="text-foreground">{context.browser}</dd>
                  <dt>Came from</dt>
                  <dd className="text-foreground">
                    {context.visits.length > 1
                      ? context.visits
                          .slice(-4, -1)
                          .map((v) => v.screen || v.route)
                          .join(" → ")
                      : "Opened here"}
                  </dd>
                  <dt>Recent errors</dt>
                  <dd className="text-foreground">
                    {context.errors.length ? `${context.errors.length} recorded` : "None"}
                  </dd>
                </dl>
              </details>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={submit.isPending || !message.trim()}>
                {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send feedback
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {picking && (
        <FeedbackPicker screen={screen} onPick={picked} onCancel={() => setPicking(false)} />
      )}
    </>
  );
};

export default FeedbackDialog;
