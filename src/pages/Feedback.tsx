import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { MessageSquarePlus, Star, Inbox, Crosshair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import { useMyFeedback, statusLabel, statusStyles } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

const Feedback = () => {
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useMyFeedback();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Feedback</h1>
          <p className="mt-1 text-muted-foreground">
            What you've sent and what we've done with it. Use the Feedback button at the top of
            any screen to send more.
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
                    {statusLabel(f.status)}
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
                {(f.screen || f.page_path) && (
                  <p className="text-[11px] text-muted-foreground">On {f.screen || f.page_path}</p>
                )}
                {f.target && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#FF5A25]">
                    <Crosshair className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.target.label}</span>
                  </p>
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
