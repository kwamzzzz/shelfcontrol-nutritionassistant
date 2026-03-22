import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";

export type ChallengeType = "protein_goal" | "consistency_streak" | "zero_waste_week" | "budget_champion";
export type ChallengeStatus = "upcoming" | "active" | "completed";

export interface Challenge {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  type: ChallengeType;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  target_value: number | null;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
}

export const CHALLENGE_TEMPLATES = [
  {
    type: "protein_goal" as ChallengeType,
    title: "Protein Goal",
    description: "Hit your daily protein target consistently. Track consumption and optimize meals for maximum protein intake.",
    defaultDays: 7,
    defaultTarget: 100,
    targetUnit: "g protein total",
    scoringNote: "Total protein (g) logged during the challenge period.",
  },
  {
    type: "consistency_streak" as ChallengeType,
    title: "Consistency Streak",
    description: "Log consumption every day during the challenge period. Build the habit of tracking what you eat.",
    defaultDays: 7,
    defaultTarget: null,
    targetUnit: null,
    scoringNote: "Number of unique days with at least one consumption log.",
  },
  {
    type: "zero_waste_week" as ChallengeType,
    title: "Zero Waste Week",
    description: "Go through the challenge period without discarding food. Plan meals, use leftovers, reduce waste.",
    defaultDays: 7,
    defaultTarget: null,
    targetUnit: null,
    scoringNote: "Fewest items wasted wins. Zero waste = perfect score.",
  },
  {
    type: "budget_champion" as ChallengeType,
    title: "Budget Champion",
    description: "Keep your grocery spend as low as possible during the challenge. Track every purchase to stay on budget.",
    defaultDays: 7,
    defaultTarget: null,
    targetUnit: null,
    scoringNote: "Lowest total spend during the challenge period wins.",
  },
];

export const useChallenges = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroupContext();
  const qc = useQueryClient();

  const challengesQuery = useQuery({
    queryKey: ["challenges", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId) return [];
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("group_id", activeGroupId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
    enabled: !!user && !!activeGroupId,
  });

  const participantsQuery = useQuery({
    queryKey: ["challenge_participants", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId) return [];
      const challengeIds = (challengesQuery.data ?? []).map((c) => c.id);
      if (!challengeIds.length) return [];
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("*")
        .in("challenge_id", challengeIds);
      if (error) throw error;
      return (data ?? []) as ChallengeParticipant[];
    },
    enabled: !!user && !!activeGroupId && !!challengesQuery.data?.length,
  });

  const createChallenge = useMutation({
    mutationFn: async (input: {
      title: string;
      type: ChallengeType;
      description: string;
      start_date: string;
      end_date: string;
      target_value: number | null;
    }) => {
      if (!user || !activeGroupId) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          ...input,
          group_id: activeGroupId,
          created_by: user.id,
          status: new Date(input.start_date) <= new Date() ? "active" : "upcoming",
        })
        .select()
        .single();
      if (error) throw error;
      // Auto-join creator
      await supabase.from("challenge_participants").insert({
        challenge_id: data.id,
        user_id: user.id,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["challenge_participants"] });
    },
  });

  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenge_participants"] }),
  });

  const leaveChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenge_participants"] }),
  });

  // Compute challenge status dynamically
  const withLiveStatus = (challenges: Challenge[]): Challenge[] => {
    const today = new Date().toISOString().split("T")[0];
    return challenges.map((c) => {
      let status: ChallengeStatus = c.status as ChallengeStatus;
      if (c.end_date < today) status = "completed";
      else if (c.start_date <= today) status = "active";
      else status = "upcoming";
      return { ...c, status };
    });
  };

  const challenges = withLiveStatus(challengesQuery.data ?? []);
  const participants = participantsQuery.data ?? [];

  return {
    challenges,
    participants,
    isLoading: challengesQuery.isLoading,
    createChallenge,
    joinChallenge,
    leaveChallenge,
    activeChallenges: challenges.filter((c) => c.status === "active"),
    upcomingChallenges: challenges.filter((c) => c.status === "upcoming"),
    completedChallenges: challenges.filter((c) => c.status === "completed"),
    isParticipant: (challengeId: string) =>
      participants.some((p) => p.challenge_id === challengeId && p.user_id === user?.id),
    participantCount: (challengeId: string) =>
      participants.filter((p) => p.challenge_id === challengeId).length,
  };
};
