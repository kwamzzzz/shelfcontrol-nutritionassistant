import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import { Crosshair, ClipboardCopy, ExternalLink, Star, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSignedImage } from "@/hooks/useSignedImage";
import {
  FEEDBACK_STATUSES, statusLabel, statusStyles, useUpdateFeedback,
  type FeedbackRow, type FeedbackStatus,
} from "@/hooks/useFeedback";
import { requestHighlight } from "@/lib/feedback-capture";
import { taskBrief } from "@/lib/feedback-task";
import { cn } from "@/lib/utils";

/**
 * The sender's picture. It is uploaded after the feedback is saved, so for a
 * few seconds (or for good, if the sender closed the app first) it may not be
 * there yet: the card says so and tries again rather than showing a broken image.
 */
const Screenshot = ({ path }: { path: string }) => {
  const [attempt, setAttempt] = useState(0);
  const [missing, setMissing] = useState(false);
  // A changed query string asks for a fresh signed link; the object path is the same.
  const src = useSignedImage(attempt ? `${path}?retry=${attempt}` : path);
  if (!src || missing) {
    return (
      <button
        type="button"
        onClick={() => {
          setMissing(false);
          setAttempt((n) => n + 1);
        }}
        className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
      >
        Picture still arriving. Check again
      </button>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block w-fit">
      <img
        key={attempt}
        src={src}
        onError={() => setMissing(true)}
        alt="The screen as the sender saw it"
        className="max-h-56 rounded-xl border border-border object-contain"
      />
    </a>
  );
};

const FeedbackCard = ({
  f,
  sender,
  onDelete,
}: {
  f: FeedbackRow;
  sender: string;
  onDelete: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const update = useUpdateFeedback();
  const [reply, setReply] = useState<string | null>(null);
  const c = f.context ?? {};

  const setStatus = async (status: FeedbackStatus) => {
    try {
      await update.mutateAsync({ id: f.id, status });
      toast.success(`Marked as ${statusLabel(status)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't update feedback.");
    }
  };

  const saveReply = async () => {
    try {
      await update.mutateAsync({ id: f.id, admin_notes: reply ?? "" });
      setReply(null);
      toast.success("Reply saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the reply.");
    }
  };

  const openWhere = () => {
    if (f.target) requestHighlight(f.target);
    navigate(f.page_path || "/");
  };

  const copyTask = async () => {
    try {
      await navigator.clipboard.writeText(taskBrief(f, sender));
      toast.success("Copied as a task");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">{f.category}</Badge>
          <Badge variant="outline" className={cn(statusStyles[f.status])}>{statusLabel(f.status)}</Badge>
          {f.rating != null && (
            <span className="flex items-center gap-0.5 text-xs text-amber-500" aria-label={`${f.rating} stars`}>
              {Array.from({ length: f.rating }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {sender} · {formatDistanceToNow(parseISO(f.created_at), { addSuffix: true })}
          </span>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{f.screen || f.page_path || "Unknown screen"}</p>
          {f.target && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#FF5A25]">
              <Crosshair className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{f.target.label}</span>
            </p>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm text-foreground">{f.message}</p>
        {f.screenshot_path && <Screenshot path={f.screenshot_path} />}

        {c.window && (
          <details className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Context</summary>
            <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              <dt>Address</dt>
              <dd className="break-all font-mono text-foreground">{f.page_path}</dd>
              <dt>Window</dt>
              <dd className="text-foreground">
                {c.window.width} × {c.window.height}
                {c.screen && ` on a ${c.screen.width} × ${c.screen.height} screen`}
              </dd>
              <dt>Browser</dt>
              <dd className="text-foreground">{c.browser}</dd>
              <dt>Came from</dt>
              <dd className="text-foreground">
                {(c.visits ?? []).length > 1
                  ? (c.visits ?? []).slice(-4, -1).map((v) => v.screen || v.route).join(" → ")
                  : "Opened there"}
              </dd>
              <dt>Errors</dt>
              <dd className="text-foreground">
                {c.errors?.length ? (
                  <ul className="list-disc pl-4">
                    {c.errors.map((e, i) => <li key={i} className="break-words">{e.message}</li>)}
                  </ul>
                ) : "None"}
              </dd>
            </dl>
          </details>
        )}

        <Textarea
          rows={2}
          placeholder="Reply to the sender (they see this under Your feedback)"
          value={reply ?? f.admin_notes ?? ""}
          onChange={(e) => setReply(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select value={f.status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
            <SelectTrigger className="h-9 w-[150px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" disabled={reply === null} onClick={saveReply}>
            Save reply
          </Button>
          <Button size="sm" variant="outline" onClick={openWhere}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Open where it happened
          </Button>
          <Button size="sm" variant="outline" onClick={copyTask}>
            <ClipboardCopy className="mr-1.5 h-4 w-4" />
            Copy as task
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={() => onDelete(f.id)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

type StatusFilter = FeedbackStatus | "open" | "all";

/**
 * The review queue: open items first by default (New and In progress),
 * narrowed by status, kind and screen.
 */
const FeedbackInbox = ({
  feedback,
  emails,
  onDelete,
}: {
  feedback: FeedbackRow[];
  emails: Record<string, string>;
  onDelete: (id: string) => void;
}) => {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [category, setCategory] = useState("all");
  const [screen, setScreen] = useState("all");

  const screens = useMemo(
    () => Array.from(new Set(feedback.map((f) => f.screen || "Unknown screen"))).sort(),
    [feedback],
  );
  const count = (s: StatusFilter) =>
    feedback.filter((f) =>
      s === "all" ? true : s === "open" ? f.status === "new" || f.status === "in_progress" : f.status === s,
    ).length;

  const shown = feedback.filter(
    (f) =>
      (status === "all" ||
        (status === "open" ? f.status === "new" || f.status === "in_progress" : f.status === status)) &&
      (category === "all" || f.category === category) &&
      (screen === "all" || (f.screen || "Unknown screen") === screen),
  );

  const chips: { value: StatusFilter; label: string }[] = [
    { value: "open", label: "Open" },
    ...FEEDBACK_STATUSES,
    { value: "all", label: "All" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setStatus(c.value)}
            aria-pressed={status === c.value}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === c.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {c.label} <span className="tabular-nums opacity-70">{count(c.value)}</span>
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[130px]" aria-label="Kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={screen} onValueChange={setScreen}>
            <SelectTrigger className="h-9 w-[180px]" aria-label="Screen">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All screens</SelectItem>
              {screens.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {feedback.length === 0 ? "No feedback submitted yet." : "Nothing matches these filters."}
          </CardContent>
        </Card>
      ) : (
        shown.map((f) => (
          <FeedbackCard key={f.id} f={f} sender={emails[f.user_id] ?? "A user"} onDelete={onDelete} />
        ))
      )}
    </div>
  );
};

export default FeedbackInbox;
