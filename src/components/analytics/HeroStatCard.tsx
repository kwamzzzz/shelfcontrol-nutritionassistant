import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  variant?: "dominant" | "standard";
  accentClass?: string;
}

const HeroStatCard = ({ icon: Icon, label, value, sub, variant = "standard", accentClass }: Props) => {
  if (variant === "dominant") {
    return (
      <div className={`rounded-2xl bg-card shadow-sm p-8 ${accentClass ?? ""}`}>
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <Icon className="h-5 w-5" />
          <p className="text-sm font-medium">{label}</p>
        </div>
        <p className="text-4xl font-display font-bold text-foreground tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-display font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
};

export default HeroStatCard;
