import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Medal, Flame, LeafyGreen, DollarSign, Beef } from "lucide-react";

interface ChallengeModule {
  icon: React.ReactNode;
  title: string;
  description: string;
  difficulty: string;
  metric: string;
  color: string;
}

const CHALLENGE_MODULES: ChallengeModule[] = [
  {
    icon: <Flame className="h-6 w-6" />,
    title: "Consistency Streak",
    description: "Log consumption every day for 7 days straight. Build the habit of tracking what you eat.",
    difficulty: "Easy",
    metric: "Days logged",
    color: "text-warning",
  },
  {
    icon: <LeafyGreen className="h-6 w-6" />,
    title: "Zero Waste Week",
    description: "Go an entire week without discarding any food items. Plan meals, use leftovers, reduce waste.",
    difficulty: "Medium",
    metric: "Items wasted",
    color: "text-success",
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Budget Champion",
    description: "Keep your weekly grocery spend under a target amount. Track every purchase to stay on budget.",
    difficulty: "Medium",
    metric: "Weekly spend",
    color: "text-primary",
  },
  {
    icon: <Beef className="h-6 w-6" />,
    title: "Protein Goal",
    description: "Hit your daily protein target for 5 out of 7 days. Track consumption and optimize your meals.",
    difficulty: "Hard",
    metric: "Daily protein (g)",
    color: "text-accent",
  },
];

const Challenges = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight font-[Outfit,var(--font-heading),sans-serif]">Challenges</h1>
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Compete with yourself or your group. Build better food habits through fun challenges.
        </p>
      </div>

      {/* Hero */}
      <Card className="rounded-2xl border-dashed bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2 font-[Outfit,var(--font-heading),sans-serif]">Challenges are coming</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Soon you'll be able to create challenges for yourself or your group — reduce waste, hit nutrition goals,
            stay on budget, and climb leaderboards.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xs">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-sm">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span className="text-[0.65rem] font-medium text-muted-foreground">Goals</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-sm">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <span className="text-[0.65rem] font-medium text-muted-foreground">Compete</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-sm">
              <Medal className="h-5 w-5 text-muted-foreground" />
              <span className="text-[0.65rem] font-medium text-muted-foreground">Earn</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenge Modules Preview */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 font-[Outfit,var(--font-heading),sans-serif]">
          Upcoming Challenges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHALLENGE_MODULES.map((challenge) => (
            <Card key={challenge.title} className="rounded-2xl shadow-sm opacity-75 hover:opacity-100 transition-opacity">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`${challenge.color}`}>
                    {challenge.icon}
                  </div>
                  <Badge variant="outline" className="text-[0.6rem]">
                    {challenge.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold font-[Outfit,var(--font-heading),sans-serif]">
                  {challenge.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
                <p className="mt-3 text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide">
                  Tracks: {challenge.metric}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
