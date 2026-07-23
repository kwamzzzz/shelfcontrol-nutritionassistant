import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGroupContext } from "@/contexts/GroupContext";
import { useChallenges } from "@/hooks/useChallenges";
import { useChallengeScoring } from "@/hooks/useChallengeScoring";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import ChallengeDetail from "@/components/challenges/ChallengeDetail";
import CreateChallengeDialog from "@/components/challenges/CreateChallengeDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ChallengeSection = ({
  title,
  challenges,
  participantCount,
  isParticipant,
  participants,
  currentUserId,
  onJoin,
  onView,
  joiningId,
}: {
  title: string;
  challenges: ReturnType<typeof useChallenges>["activeChallenges"];
  participantCount: (id: string) => number;
  isParticipant: (id: string) => boolean;
  participants: ReturnType<typeof useChallenges>["participants"];
  currentUserId: string | undefined;
  onJoin: (id: string) => void;
  onView: (id: string) => void;
  joiningId: string | null;
}) => {
  if (!challenges.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-[Outfit,var(--font-heading),sans-serif]">
        {title} ({challenges.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {challenges.map((c) => (
          <ChallengeCardWithScoring
            key={c.id}
            challenge={c}
            participants={participants}
            participantCount={participantCount(c.id)}
            isParticipant={isParticipant(c.id)}
            currentUserId={currentUserId}
            onJoin={() => onJoin(c.id)}
            onView={() => onView(c.id)}
            joining={joiningId === c.id}
          />
        ))}
      </div>
    </div>
  );
};

const ChallengeCardWithScoring = ({
  challenge,
  participants,
  ...rest
}: {
  challenge: ReturnType<typeof useChallenges>["challenges"][0];
  participants: ReturnType<typeof useChallenges>["participants"];
} & Omit<React.ComponentProps<typeof ChallengeCard>, "challenge" | "scores">) => {
  const { data: scores } = useChallengeScoring(challenge, participants);
  return <ChallengeCard challenge={challenge} scores={scores ?? []} {...rest} />;
};

const Challenges = () => {
  const { user } = useAuth();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const {
    challenges,
    participants,
    isLoading,
    activeChallenges,
    upcomingChallenges,
    completedChallenges,
    joinChallenge,
    leaveChallenge,
    isParticipant,
    participantCount,
  } = useChallenges();

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [phoneTab, setPhoneTab] = useState<"active" | "upcoming" | "completed">("active");

  const handleJoin = async (challengeId: string) => {
    setJoiningId(challengeId);
    try {
      await joinChallenge.mutateAsync(challengeId);
      toast.success("You joined the challenge!");
    } catch {
      toast.error("Could not join challenge");
    } finally {
      setJoiningId(null);
    }
  };

  const viewingChallenge = challenges.find((c) => c.id === viewingId);

  // Personal mode - no challenges
  if (isPersonalMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[Outfit,var(--font-heading),sans-serif]">Challenges</h1>
          <p className="text-muted-foreground mt-1">Compete with your group to build better food habits.</p>
        </div>
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2 font-[Outfit,var(--font-heading),sans-serif]">
              Challenges work best in groups
            </h2>
            <p className="text-muted-foreground max-w-md text-sm">
              Switch to a group from the header to create or join challenges with your household, roommates, or friends.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view
  if (viewingChallenge) {
    return (
      <div className="max-w-3xl mx-auto">
        <ChallengeDetail
          challenge={viewingChallenge}
          participants={participants}
          currentUserId={user?.id}
          isParticipant={isParticipant(viewingChallenge.id)}
          onBack={() => setViewingId(null)}
          onJoin={() => handleJoin(viewingChallenge.id)}
          onLeave={async () => {
            await leaveChallenge.mutateAsync(viewingChallenge.id);
            toast.success("You left the challenge");
          }}
        />
      </div>
    );
  }

  const sectionProps = {
    participantCount,
    isParticipant,
    participants,
    currentUserId: user?.id,
    onJoin: handleJoin,
    onView: setViewingId,
    joiningId,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-[Outfit,var(--font-heading),sans-serif]">
              Challenges
            </h1>
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground mt-1">
            Compete with your group. Build better food habits together.
          </p>
        </div>
        <CreateChallengeDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2 font-[Outfit,var(--font-heading),sans-serif]">
              No challenges yet
            </h2>
            <p className="text-muted-foreground max-w-md text-sm mb-4">
              Create your first challenge and invite your group to compete on protein goals, waste reduction, budget control, or consistency.
            </p>
            <CreateChallengeDialog />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Phone: segmented Current/Available/Completed selector */}
          <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1 sm:hidden">
            {([["active", "Active"], ["upcoming", "Upcoming"], ["completed", "Completed"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPhoneTab(key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  phoneTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Phone: only the selected section */}
          <div className="sm:hidden">
            {phoneTab === "active" && <ChallengeSection title="Active" challenges={activeChallenges} {...sectionProps} />}
            {phoneTab === "upcoming" && <ChallengeSection title="Upcoming" challenges={upcomingChallenges} {...sectionProps} />}
            {phoneTab === "completed" && <ChallengeSection title="Completed" challenges={completedChallenges} {...sectionProps} />}
          </div>

          {/* Tablet / desktop: all sections stacked */}
          <div className="hidden space-y-8 sm:block">
            <ChallengeSection title="Active" challenges={activeChallenges} {...sectionProps} />
            <ChallengeSection title="Upcoming" challenges={upcomingChallenges} {...sectionProps} />
            <ChallengeSection title="Completed" challenges={completedChallenges} {...sectionProps} />
          </div>
        </>
      )}
    </div>
  );
};

export default Challenges;
