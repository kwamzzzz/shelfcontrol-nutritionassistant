import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Users, Calendar, Flame, LeafyGreen, DollarSign, Beef } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { useProfileNames } from "@/hooks/useProfileNames";
import type { Challenge, ChallengeType } from "@/hooks/useChallenges";
import type { ParticipantScore } from "@/hooks/useChallengeScoring";

const TYPE_ICONS: Record<ChallengeType, React.ReactNode> = {
  protein_goal: <Beef className="h-4 w-4" />,
  consistency_streak: <Flame className="h-4 w-4" />,
  zero_waste_week: <LeafyGreen className="h-4 w-4" />,
  budget_champion: <DollarSign className="h-4 w-4" />,
};

const TYPE_COLORS: Record<ChallengeType, string> = {
  protein_goal: "bg-accent/10 text-accent border-accent/20",
  consistency_streak: "bg-warning/10 text-warning border-warning/20",
  zero_waste_week: "bg-success/10 text-success border-success/20",
  budget_champion: "bg-primary/10 text-primary border-primary/20",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  upcoming: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground",
};

const RANK_STYLES = [
  "text-amber-500 font-bold",
  "text-slate-400 font-semibold",
  "text-orange-600 font-semibold",
];

interface Props {
  challenge: Challenge;
  participantCount: number;
  isParticipant: boolean;
  scores: ParticipantScore[];
  currentUserId: string | undefined;
  onJoin: () => void;
  onView: () => void;
  joining: boolean;
}

const ChallengeCard = ({
  challenge,
  participantCount,
  isParticipant,
  scores,
  currentUserId,
  onJoin,
  onView,
  joining,
}: Props) => {
  const today = new Date();
  const start = parseISO(challenge.start_date);
  const end = parseISO(challenge.end_date);
  const totalDays = differenceInDays(end, start) || 1;
  const elapsed = Math.max(0, Math.min(differenceInDays(today, start), totalDays));
  const daysLeft = Math.max(0, differenceInDays(end, today));
  const progressPct = challenge.status === "completed" ? 100 : Math.round((elapsed / totalDays) * 100);

  const top3 = scores.slice(0, 3);
  const topUserIds = top3.map((s) => s.user_id);
  const { data: names } = useProfileNames(topUserIds);

  const userRank = scores.find((s) => s.user_id === currentUserId);

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between">
          <Badge variant="outline" className={`text-[10px] gap-1 ${TYPE_COLORS[challenge.type as ChallengeType]}`}>
            {TYPE_ICONS[challenge.type as ChallengeType]}
            {challenge.type.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[challenge.status]}`}>
            {challenge.status}
          </Badge>
        </div>
        <h3 className="text-lg font-bold font-[Outfit,var(--font-heading),sans-serif] leading-tight">
          {challenge.title}
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenge.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
        )}

        {/* Date + participants */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(start, "MMM d")} – {format(end, "MMM d")}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {participantCount}
          </span>
        </div>

        {/* Progress */}
        {challenge.status !== "upcoming" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{challenge.status === "completed" ? "Completed" : `${daysLeft} days left`}</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}

        {/* Mini leaderboard */}
        {top3.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leaderboard</p>
            {top3.map((entry, i) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                  entry.user_id === currentUserId ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={RANK_STYLES[i] ?? "text-muted-foreground"}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="font-medium">
                    {names?.get(entry.user_id) ?? "Member"}
                  </span>
                </span>
                <span className="font-mono text-muted-foreground">{entry.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* User rank if not in top 3 */}
        {userRank && userRank.rank > 3 && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2 py-1.5 flex justify-between">
            <span>Your rank: <strong>#{userRank.rank}</strong></span>
            <span className="font-mono">{userRank.label}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {challenge.status !== "completed" && !isParticipant && (
            <Button size="sm" className="flex-1" onClick={onJoin} disabled={joining}>
              Join Challenge
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
            {challenge.status === "completed" ? "View Results" : "View Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeCard;
