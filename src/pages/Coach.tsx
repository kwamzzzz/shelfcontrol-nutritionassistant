import { useEffect, useRef, useState } from "react";
import { useChatCoach } from "@/hooks/useChatCoach";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, RotateCcw, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What should I eat today to hit my protein goal?",
  "Why might I be feeling low energy this week?",
  "Suggest a recipe using what's in my pantry.",
  "Am I on track this week?",
];

const Coach = () => {
  const { messages, isLoading, send, reset } = useChatCoach();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    send(text);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Shelf Coach
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Personalised guidance from your nutrition, symptoms, and pantry data.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            New chat
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask anything about your nutrition, weight trend, or how a meal made you feel. The coach sees your last 7 days of logs, recent symptoms, weigh-ins, and goals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-left text-sm rounded-xl border bg-card hover:bg-accent/40 px-3 py-2.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                General wellness, not medical advice. For symptoms that persist or worry you, see a clinician.
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2.5 items-start",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask the coach..."
          rows={1}
          className="rounded-xl resize-none min-h-[44px]"
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Coach;
