import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Save, ChefHat, Scale } from "lucide-react";
import { toast } from "sonner";
import WeighInTracker from "@/components/nutrition/WeighInTracker";

const CUISINE_OPTIONS = [
  "African",
  "Arab / Middle Eastern",
  "Mediterranean",
  "European",
  "Asian",
  "Indian",
  "Latin American",
  "Caribbean",
  "American",
] as const;

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setCuisines(profile.cuisine_preferences ?? []);
    }
  }, [profile]);

  const toggleCuisine = (c: string) => {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, cuisine_preferences: cuisines })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account</p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm mt-1">{user?.email ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-1 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Cuisine Preferences
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Used to personalise recipe suggestions and food advice. Pick any that apply.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => {
              const selected = cuisines.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCuisine(c)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                  aria-pressed={selected}
                >
                  <Badge
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer rounded-full px-3 py-1 text-xs"
                  >
                    {c}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
          className="gap-2 rounded-xl"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Weigh-ins
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Log your weight to see trends and feed your goal calculations.
          </p>
        </CardHeader>
        <CardContent>
          <WeighInTracker />
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
