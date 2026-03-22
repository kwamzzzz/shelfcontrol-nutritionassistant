import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Calendar, Users, Target, Flame, LeafyGreen, DollarSign, Beef } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useChallengeScoring } from "@/hooks/useChallengeScoring";
import { CHALLENGE_TEMPLATES, type Challenge, type ChallengeParticipant, type ChallengeType } from "@/hooks/useChallenges";

const TYPE_ICONS: Record<ChallengeType, React.ReactNode> = {
  protein_goal: <Beef className="h-6 w-6" />,
  consistency_streak: <Flame className="h-6 w-6" />,
  zero_waste_week: <LeafyGreen className="h-6 w-6" />,
  budget_champion: <DollarSign className="h-6 w-6" />,
};

const RANK_BG = [
  "bg-amber-500/10 border-amber-500/30",
  "bg-slate-300/10 border-slate-300/30",
  "bg-orange-500/10 border-orange-500/30",
];

interface Props {
  challenge: Challenge;
  participants: ChallengeParticipant[];
  currentUserId: string | undefined;
  isParticipant: boolean;
  onBack: () => void;
  onJoin: () => void;
  onLeave: () => void;
}

const ChallengeDetail = ({ challenge, participants, currentUserId, isParticipant, onBack, onJoin, onLeave }: Props) => {
  const challengeParticipants = participants.filter((p) => p.challenge_id === challenge.id);
  const { data: scores, isLoading } = useChallengeScoring(challenge, participants);
  const allUserIds = challengeParticipants.map((p) => p.user_id);
  const { data: names } = useProfileNames(allUserIds);
  const template = CHALLENGE_TEMPLATES.find((t) => t.type === challenge.type);

  const today = new Date();
  const start = parseISO(challenge.start_date);
  const end = parseISO(challenge.end_date);
  const totalDays = differenceInDays(end, start) || 1;
  const elapsed = Math.max(0, Math.min(differenceInDays(today, start), totalDays));
  const daysLeft = Math.max(0, differenceInDays(end, today));
  const progressPct = challenge.status === "completed" ? 100 : Math.round((elapsed / totalDays) * 100);

  const userScore = scores?.find((s) => s.user_id === currentUserId);
  const winner = challenge.status === "completed" && scores?.[0];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Challenges
      </button>

      {/* Hero */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {TYPE_ICONS[challenge.type as ChallengeType]}
              </div>
              <div>
                <CardTitle className="text-2xl font-[Outfit,var(--font-heading),sans-serif]">
                  {challenge.title}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {challenge.type.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <Badge variant={challenge.status === "active" ? "default" : "secondary"}>
              {challenge.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {challenge.description && (
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(start, "MMM d")} – {format(end, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{challengeParticipants.length} participants</span>
            </div>
            {challenge.target_value && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>Target: {challenge.target_value} {template?.targetUnit}</span>
              </div>
            )}
            {challenge.status === "active" && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{daysLeft} days remaining</span>
              </div>
            )}
          </div>

          {challenge.status !== "upcoming" && (
            <div className="space-y-1">
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progressPct}% elapsed</p>
            </div>
          )}

          {/* Your rank */}
          {isParticipant && userScore && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Your Position</p>
                <p className="text-2xl font-bold font-[Outfit,var(--font-heading),sans-serif]">#{userScore.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-lg font-bold font-mono">{userScore.label}</p>
              </div>
            </div>
          )}

          {/* Winner banner */}
          {winner && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-bold">🏆 Winner: {names?.get(winner.user_id) ?? "Member"}</p>
                <p className="text-sm text-muted-foreground">Score: {winner.label}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {challenge.status !== "completed" && !isParticipant && (
              <Button onClick={onJoin}>Join Challenge</Button>
            )}
            {isParticipant && challenge.status !== "completed" && (
              <Button variant="outline" onClick={onLeave}>Leave Challenge</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-[Outfit,var(--font-heading),sans-serif]">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{template?.scoringNote ?? "Scores are computed from your tracked data."}</p>
          {challenge.type === "zero_waste_week" || challenge.type === "budget_champion" ? (
            <p className="text-xs text-muted-foreground mt-2">Lower is better — the participant with the least wins.</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Higher is better — the participant with the most wins.</p>
          )}
        </CardContent>
      </Card>

      {/* Full leaderboard */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-[Outfit,var(--font-heading),sans-serif]">Full Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Computing scores…</p>
          ) : !scores?.length ? (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          ) : (
            <div className="space-y-2">
              {scores.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    i < 3 ? RANK_BG[i] : "bg-card"
                  } ${entry.user_id === currentUserId ? "ring-1 ring-primary/30" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                    </span>
                    <span className="font-medium text-sm">
                      {names?.get(entry.user_id) ?? "Member"}
                      {entry.user_id === currentUserId && (
                        <Badge variant="secondary" className="ml-2 text-[9px]">You</Badge>
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold">{entry.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChallengeDetail;
