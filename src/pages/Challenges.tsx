import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, Medal } from "lucide-react";

const Challenges = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground mt-1">Compete and achieve together</p>
      </div>

      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Challenge your household or group to reduce waste, eat healthier, or stay on budget.
            Track progress, earn badges, and compete on leaderboards.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50">
              <Target className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Shared Goals</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50">
              <Trophy className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Competitions</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50">
              <Medal className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Leaderboards</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Challenges;
