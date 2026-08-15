import { useState } from "react";
import { useLocation } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageSquare, Star, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/shared/ImageUpload";
import { useSubmitFeedback, type FeedbackCategory } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(4, { message: "Please tell us a little more (at least 4 characters)." })
    .max(2000, { message: "Please keep feedback under 2000 characters." }),
});

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ElementType }[] = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "idea", label: "Idea", icon: Lightbulb },
  { value: "general", label: "General", icon: MessageSquare },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDialog = ({ open, onOpenChange }: Props) => {
  const { pathname } = useLocation();
  const submit = useSubmitFeedback();

  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const reset = () => {
    setCategory("general");
    setRating(null);
    setMessage("");
    setScreenshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      await submit.mutateAsync({
        category,
        rating,
        message: parsed.data.message,
        page_path: pathname,
        screenshot_path: screenshot,
      });
      toast.success("Thanks! Your feedback has been sent.");
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't send feedback. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what's working, what isn't, or what you'd love to see next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
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
          </div>

          <div className="space-y-2">
            <Label>How would you rate your experience?</Label>
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
            <Label htmlFor="feedback-message">Your feedback</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="What happened, or what would you change?"
            />
            <p className="text-right text-[11px] text-muted-foreground">{message.length}/2000</p>
          </div>

          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <ImageUpload
              currentUrl={screenshot}
              folder="feedback"
              onUploaded={(url) => setScreenshot(url)}
              onRemoved={() => setScreenshot(null)}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            We'll include the page you're on ({pathname}) to help us reproduce issues.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
