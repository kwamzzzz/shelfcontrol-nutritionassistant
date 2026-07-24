import { useState } from "react";
import { Info } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { LIST_FOLLOW_THROUGH_MIN_ITEMS, PERSONALITY_MIN_FOODS } from "@/lib/kitchen-story";

const METHODS: { term: string; detail: string }[] = [
  {
    term: "Items in your pantry",
    detail:
      "A live count of everything currently in your pantry. Pantry figures always describe right now, whatever range you pick.",
  },
  {
    term: "In good shape",
    detail:
      "The share of your pantry that has not passed its expiry date. Items you never gave a date to are counted as fine, not as a problem.",
  },
  {
    term: "Use soon",
    detail:
      "Anything with three days or fewer left — the same threshold the Pantry screen uses, so the two never disagree.",
  },
  {
    term: "Foods you manage",
    detail:
      "Distinct foods across your pantry and the purchases in this range. Buying the same thing twice counts once.",
  },
  {
    term: "Never thrown away",
    detail:
      "Of the distinct foods you bought in this range, the ones that never show up in a discard log.",
  },
  {
    term: "Longest clear run",
    detail:
      "The longest stretch with no discard logged, measured between the start of the range (or your first activity, for all time) and today.",
  },
  {
    term: "Trips and spend",
    detail:
      "A count of the purchases you logged and the sum of the totals you entered. Nothing is estimated — if you did not enter a price, it is not counted.",
  },
  {
    term: "You reach for this most",
    detail:
      "Ranked by how many separate trips something appears on, counted once per trip. Quantities are deliberately ignored — 1600 grams of rice and a dozen eggs are not comparable numbers.",
  },
  {
    term: "Your store",
    detail:
      "Trips grouped by store name, matched without regard to capitalisation or spacing, and shown the way you first wrote it.",
  },
  {
    term: "List follow-through",
    detail: `The share of shopping-list entries you ticked off. Hidden until there are at least ${LIST_FOLLOW_THROUGH_MIN_ITEMS} entries, below which the percentage is too jumpy to mean anything.`,
  },
  {
    term: "Average wait",
    detail: "The mean time between adding something to the list and ticking it off.",
  },
  {
    term: "Days tracked",
    detail:
      "Distinct calendar days with at least one thing logged, and the longest unbroken run of them. Two logs on one day still count as one day.",
  },
  {
    term: "Your kitchen personality",
    detail: `Matched in a fixed order: zero waste (needs at least ${PERSONALITY_MIN_FOODS} foods bought), then planner, collector, regular, well-stocked, tracker. If none fit, you are a steady hand.`,
  },
];

const ABSENT: { term: string; detail: string }[] = [
  {
    term: "Why there is no money saved",
    detail:
      "Discarded food is not priced anywhere in your data, and a thrown-away item cannot be traced back to what it cost. Any savings figure would be a guess dressed up as a fact, so we leave it out.",
  },
  {
    term: "Why there are no meals cooked",
    detail:
      "Nothing currently records when a recipe was actually cooked, so your cookbook is counted by what you have saved rather than what you have made.",
  },
];

export function StoryMethodSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card/60 px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
      >
        <Info className="h-4 w-4" />
        How these are worked out
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="text-center">
            <DrawerTitle>How these are worked out</DrawerTitle>
            <DrawerDescription>
              Every figure comes from something you logged. Nothing here is estimated.
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6">
            <dl className="space-y-4">
              {METHODS.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-sm font-semibold text-foreground">{entry.term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {entry.detail}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
              <dl className="space-y-4">
                {ABSENT.map((entry) => (
                  <div key={entry.term}>
                    <dt className="text-sm font-semibold text-foreground">{entry.term}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {entry.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
