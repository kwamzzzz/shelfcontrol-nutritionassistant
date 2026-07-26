import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StoryArt } from "@/components/story/StoryArt";
import { StoryCard, StoryChapter } from "@/components/story/StoryCard";
import { StoryHero } from "@/components/story/StoryHero";
import { StoryMethodSheet } from "@/components/story/StoryMethodSheet";
import { StoryShare } from "@/components/story/StoryShare";
import { useKitchenStory } from "@/hooks/useKitchenStory";
import { buildShareText, type StoryRange } from "@/lib/kitchen-story";
import { getActiveCurrency } from "@/lib/currency";

/** Story figures are rounded — decimals read as noise at this size. */
const money = (value: number) =>
  `${getActiveCurrency().symbol} ${Math.round(value).toLocaleString()}`;

const percent = (value: number) => `${Math.round(value)}%`;

export default function KitchenStory() {
  const [range, setRange] = useState<StoryRange>("all");
  const { story, firstName, scopeLabel, isLoading, isError } = useKitchenStory(range);
  const navigate = useNavigate();
  const location = useLocation();

  // This page owns its scroll position; the app has no global scroll reset.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const close = () => {
    // `default` means this was the first entry — there is nothing to go back to.
    if (location.key === "default") navigate("/");
    else navigate(-1);
  };

  const { pantry, rescue, shopping, cookbook, habits, personality } = story;

  return (
    <div className="app-canvas min-h-dvh">
      <StoryHero
        firstName={firstName}
        memberSince={story.memberSince}
        scopeLabel={scopeLabel}
        range={range}
        onRangeChange={setRange}
        onClose={close}
      />

      <main className="mx-auto max-w-3xl px-4 pb-[calc(3rem+var(--safe-bottom))]">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[168px] rounded-3xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="surface-panel rounded-3xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              We could not load your story just now. Pull down to refresh, or try again in a moment.
            </p>
          </div>
        ) : !story.hasData ? (
          <div className="surface-panel relative overflow-hidden rounded-3xl p-6 text-center">
            <StoryArt
              name="sprout"
              className="mx-auto mb-2 h-24 w-auto"
            />
            <h2 className="font-[Outfit,sans-serif] text-lg font-semibold text-foreground">
              Your story starts with your first shelf
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Add a few things to your pantry and log a shop or two. Come back here and this page
              will have something to say about it.
            </p>
            <button
              type="button"
              onClick={() => navigate("/pantry")}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              Go to your pantry
            </button>
          </div>
        ) : (
          <div className="space-y-10 duration-700 animate-in fade-in-0 slide-in-from-bottom-3">
            <StoryChapter kicker="Chapter one" title="Your kitchen at a glance">
              <StoryCard
                label="On your shelves"
                value={pantry.total}
                context="right now"
                art="pantry"
                a11yLabel={`${pantry.total} items on your shelves right now.`}
              />
              {pantry.goodShare !== null && (
                <StoryCard
                  label="In good shape"
                  value={pantry.goodShare}
                  format={percent}
                  context="within date"
                  art="sprout"
                  tone="success"
                  a11yLabel={`${pantry.goodShare} percent of your pantry is still within date.`}
                />
              )}
              <StoryCard
                label="Foods you manage"
                value={story.foodsManaged}
                context="different foods"
                art="basket"
                a11yLabel={`You manage ${story.foodsManaged} different foods.`}
              />
              {story.topStorage && (
                <StoryCard
                  label="Where it all lives"
                  display={story.topStorage.label}
                  context={`${story.topStorage.count} items`}
                  art="pantry"
                  a11yLabel={`Your most-used storage spot is the ${story.topStorage.label}, holding ${story.topStorage.count} items.`}
                />
              )}
              {pantry.useSoon > 0 && (
                <StoryCard
                  label="Worth cooking first"
                  value={pantry.useSoon}
                  context="use these first"
                  art="clock"
                  tone="warning"
                  a11yLabel={`${pantry.useSoon} items are worth cooking in the next few days.`}
                />
              )}
            </StoryChapter>

            {rescue.foodsBought > 0 && (
              <StoryChapter kicker="Chapter two" title="Nothing wasted">
                {rescue.neverWastedShare !== null && (
                  <StoryCard
                    label="Never thrown away"
                    value={rescue.neverWastedShare}
                    format={percent}
                    context={`${rescue.foodsNeverWasted} of the ${rescue.foodsBought} foods you bought`}
                    art="sprout"
                    tone="success"
                    span="full"
                    a11yLabel={`${rescue.foodsNeverWasted} of the ${rescue.foodsBought} foods you bought were never thrown away, or ${rescue.neverWastedShare} percent.`}
                  />
                )}
                {rescue.eatenShare !== null && (
                  <StoryCard
                    label="Eaten, not binned"
                    value={rescue.eatenShare}
                    format={percent}
                    context={`${rescue.eatenCount} eaten · ${rescue.thrownOutCount} thrown out`}
                    art="sprout"
                    tone="success"
                    a11yLabel={`Of everything that left your kitchen, ${rescue.eatenShare} percent was eaten: ${rescue.eatenCount} eaten and ${rescue.thrownOutCount} thrown out.`}
                  />
                )}
                {rescue.longestNoWasteRun !== null && (
                  <StoryCard
                    label="Longest clear run"
                    value={rescue.longestNoWasteRun}
                    context="days, nothing wasted"
                    art="clock"
                    tone="success"
                    a11yLabel={`Your longest run without wasting anything is ${rescue.longestNoWasteRun} days.`}
                  />
                )}
                {story.topCategory && (
                  <StoryCard
                    label="Your kitchen leans"
                    display={story.topCategory.label}
                    context="most of all"
                    art="basket"
                    a11yLabel={`You buy more ${story.topCategory.label} than anything else.`}
                  />
                )}
              </StoryChapter>
            )}

            {shopping.trips > 0 && (
              <StoryChapter kicker="Chapter three" title="How you shop">
                {shopping.spent > 0 && (
                  <StoryCard
                    label="Through your kitchen"
                    value={shopping.spent}
                    format={money}
                    context={
                      shopping.avgPerTrip ? `about ${money(shopping.avgPerTrip)} a trip` : null
                    }
                    art="basket"
                    span="full"
                    a11yLabel={`You logged ${money(shopping.spent)} of shopping across ${shopping.trips} trips.`}
                  />
                )}
                <StoryCard
                  label="Shopping trips"
                  value={shopping.trips}
                  context="logged"
                  art="basket"
                  a11yLabel={`You logged ${shopping.trips} shopping trips.`}
                />
                {shopping.mostBought && (
                  <StoryCard
                    label="You reach for this most"
                    display={shopping.mostBought.label}
                    context={`on ${shopping.mostBought.count} of ${shopping.trips} trips`}
                    art="basket"
                    a11yLabel={`The thing you buy most often is ${shopping.mostBought.label}, on ${shopping.mostBought.count} of your ${shopping.trips} trips.`}
                  />
                )}
                {shopping.topStore && (
                  <StoryCard
                    label="Your regular"
                    display={shopping.topStore.label}
                    context={`${shopping.topStore.count} trips`}
                    art="home"
                    a11yLabel={`Your most-visited store is ${shopping.topStore.label}, with ${shopping.topStore.count} trips.`}
                  />
                )}
                {shopping.listFollowThrough !== null && (
                  <StoryCard
                    label="List follow-through"
                    value={shopping.listFollowThrough}
                    format={percent}
                    context="of your list, bought"
                    art="rhythm"
                    tone="success"
                    a11yLabel={`You bought ${shopping.listFollowThrough} percent of what you put on your shopping list.`}
                  />
                )}
                {shopping.avgDaysOnList !== null && (
                  <StoryCard
                    label="Average wait"
                    value={shopping.avgDaysOnList}
                    format={(n) => (n < 1 ? "Same day" : `${n.toFixed(1)}`)}
                    context={shopping.avgDaysOnList < 1 ? "list to basket" : "days on the list"}
                    art="clock"
                    a11yLabel={`On average, things wait ${shopping.avgDaysOnList} days on your list before you buy them.`}
                  />
                )}
              </StoryChapter>
            )}

            {cookbook.recipes > 0 && (
              <StoryChapter kicker="Chapter four" title="Your cookbook">
                <StoryCard
                  label="Recipes saved"
                  value={cookbook.recipes}
                  context="saved so far"
                  art="cookbook"
                  a11yLabel={`You have saved ${cookbook.recipes} recipes.`}
                />
                {cookbook.ingredients > 0 && (
                  <StoryCard
                    label="Ingredients in play"
                    value={cookbook.ingredients}
                    context="across recipes"
                    art="cookbook"
                    a11yLabel={`Your recipes use ${cookbook.ingredients} different ingredients.`}
                  />
                )}
                {cookbook.topTag && (
                  <StoryCard
                    label="Your kind of cooking"
                    display={cookbook.topTag.label}
                    context={`${cookbook.topTag.count} recipes tagged`}
                    art="cookbook"
                    a11yLabel={`Your most-used recipe tag is ${cookbook.topTag.label}, on ${cookbook.topTag.count} recipes.`}
                  />
                )}
              </StoryChapter>
            )}

            {habits.logs > 0 && (
              <StoryChapter kicker="Chapter five" title="Your rhythm">
                <StoryCard
                  label="Days tracked"
                  value={habits.daysLogged}
                  context="separate days"
                  art="rhythm"
                  a11yLabel={`You logged food on ${habits.daysLogged} separate days.`}
                />
                <StoryCard
                  label="Longest streak"
                  value={habits.longestLoggingRun}
                  context="days in a row"
                  art="rhythm"
                  tone="success"
                  a11yLabel={`Your longest unbroken run of logging is ${habits.longestLoggingRun} days.`}
                />
              </StoryChapter>
            )}

            {personality && (
              <section className="surface-raised relative overflow-hidden rounded-3xl p-6 text-center">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_62%)]"
                />
                <p className="font-analytics text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  And finally
                </p>
                <StoryArt name="badge" className="mx-auto mt-3 h-24 w-auto" />
                <h2 className="mt-2 font-[Outfit,sans-serif] text-2xl font-semibold tracking-tight text-foreground">
                  {personality.title}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {personality.blurb}
                </p>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <StoryShare text={buildShareText(story)} />
                  <StoryMethodSheet />
                </div>
              </section>
            )}

            <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built from what you logged in your {scopeLabel.toLowerCase()}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
