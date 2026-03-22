import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Challenge, ChallengeParticipant, ChallengeType } from "./useChallenges";

export interface ParticipantScore {
  user_id: string;
  score: number;
  rank: number;
  label: string;
}

export const useChallengeScoring = (
  challenge: Challenge | null,
  participants: ChallengeParticipant[]
) => {
  const { user } = useAuth();
  const challengeParticipants = participants.filter(
    (p) => p.challenge_id === challenge?.id
  );
  const userIds = challengeParticipants.map((p) => p.user_id);

  return useQuery({
    queryKey: ["challenge_scores", challenge?.id, userIds.sort().join(",")],
    queryFn: async (): Promise<ParticipantScore[]> => {
      if (!challenge || !userIds.length) return [];

      const start = challenge.start_date;
      const end = challenge.end_date + "T23:59:59";

      const scores = await computeScores(challenge.type as ChallengeType, userIds, start, end, challenge.group_id);

      // Sort and rank
      const sorted = [...scores].sort((a, b) => {
        if (challenge.type === "zero_waste_week" || challenge.type === "budget_champion") {
          return a.score - b.score; // lower is better
        }
        return b.score - a.score; // higher is better
      });

      return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
    },
    enabled: !!challenge && userIds.length > 0,
    staleTime: 30_000,
  });
};

async function computeScores(
  type: ChallengeType,
  userIds: string[],
  start: string,
  end: string,
  groupId: string
): Promise<Omit<ParticipantScore, "rank">[]> {
  switch (type) {
    case "protein_goal":
      return computeProtein(userIds, start, end, groupId);
    case "consistency_streak":
      return computeConsistency(userIds, start, end, groupId);
    case "zero_waste_week":
      return computeWaste(userIds, start, end, groupId);
    case "budget_champion":
      return computeBudget(userIds, start, end, groupId);
    default:
      return userIds.map((id) => ({ user_id: id, score: 0, label: "0" }));
  }
}

async function computeProtein(userIds: string[], start: string, end: string, groupId: string) {
  // Get consumption logs with item nutrition
  const { data: logs } = await supabase
    .from("consumption_logs")
    .select("user_id, quantity, item_id")
    .in("user_id", userIds)
    .gte("consumed_at", start)
    .lte("consumed_at", end);

  if (!logs?.length) return userIds.map((id) => ({ user_id: id, score: 0, label: "0g" }));

  const itemIds = [...new Set(logs.map((l) => l.item_id))];
  const { data: items } = await supabase
    .from("items")
    .select("id, protein_g")
    .in("id", itemIds);

  const proteinMap = new Map((items ?? []).map((i) => [i.id, i.protein_g ?? 0]));

  const userScores = new Map<string, number>();
  userIds.forEach((id) => userScores.set(id, 0));

  logs.forEach((log) => {
    const protein = proteinMap.get(log.item_id) ?? 0;
    const current = userScores.get(log.user_id) ?? 0;
    userScores.set(log.user_id, current + protein * log.quantity);
  });

  return userIds.map((id) => ({
    user_id: id,
    score: Math.round(userScores.get(id) ?? 0),
    label: `${Math.round(userScores.get(id) ?? 0)}g`,
  }));
}

async function computeConsistency(userIds: string[], start: string, end: string, groupId: string) {
  const { data: logs } = await supabase
    .from("consumption_logs")
    .select("user_id, consumed_at")
    .in("user_id", userIds)
    .gte("consumed_at", start)
    .lte("consumed_at", end);

  const userDays = new Map<string, Set<string>>();
  userIds.forEach((id) => userDays.set(id, new Set()));

  (logs ?? []).forEach((log) => {
    const day = log.consumed_at.split("T")[0];
    userDays.get(log.user_id)?.add(day);
  });

  return userIds.map((id) => {
    const days = userDays.get(id)?.size ?? 0;
    return { user_id: id, score: days, label: `${days} days` };
  });
}

async function computeWaste(userIds: string[], start: string, end: string, groupId: string) {
  const { data: logs } = await supabase
    .from("waste_logs")
    .select("user_id, quantity")
    .in("user_id", userIds)
    .gte("discarded_at", start)
    .lte("discarded_at", end);

  const userWaste = new Map<string, number>();
  userIds.forEach((id) => userWaste.set(id, 0));

  (logs ?? []).forEach((log) => {
    const current = userWaste.get(log.user_id) ?? 0;
    userWaste.set(log.user_id, current + log.quantity);
  });

  return userIds.map((id) => {
    const waste = userWaste.get(id) ?? 0;
    return { user_id: id, score: waste, label: waste === 0 ? "Zero waste!" : `${waste} items` };
  });
}

async function computeBudget(userIds: string[], start: string, end: string, groupId: string) {
  const { data: purchases } = await supabase
    .from("purchases")
    .select("user_id, total_cost")
    .in("user_id", userIds)
    .gte("purchased_at", start)
    .lte("purchased_at", end);

  const userSpend = new Map<string, number>();
  userIds.forEach((id) => userSpend.set(id, 0));

  (purchases ?? []).forEach((p) => {
    const current = userSpend.get(p.user_id) ?? 0;
    userSpend.set(p.user_id, current + (p.total_cost ?? 0));
  });

  return userIds.map((id) => {
    const spend = userSpend.get(id) ?? 0;
    return { user_id: id, score: spend, label: `AED ${spend.toFixed(0)}` };
  });
}
