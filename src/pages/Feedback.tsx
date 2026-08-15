import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { MessageSquarePlus, Star, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import { useMyFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20",
  reviewed: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
};

const Feedback = () => {
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useMyFeedback();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Feedback</h1>
          <p className="mt-1 text-muted-foreground">
            Share bugs, ideas and ratings — and follow what we've done with them.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Send feedback
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="space-y-3 py-16 text-center">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">No feedback yet</h2>
            <p className="text-sm text-muted-foreground">
              Anything you send will show up here with its status.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id} className="rounded-2xl shadow-sm">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">{f.category}</Badge>
                  <Badge variant="outline" className={cn(statusStyles[f.status])}>
                    {f.status}
                  </Badge>
                  {f.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      {Array.from({ length: f.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(f.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{f.message}</p>
                {f.page_path && (
                  <p className="text-[11px] text-muted-foreground">Page: {f.page_path}</p>
                )}
                {f.admin_notes && (
                  <p className="rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Reply: </span>{f.admin_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Feedback;
