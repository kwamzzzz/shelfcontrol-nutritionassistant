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
      <div className={`rounded-2xl bg-card shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] p-8 ${accentClass ?? ""}`}>
        <div className="flex items-center gap-3 text-muted-foreground mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-medium font-analytics tracking-wide">{label}</p>
        </div>
        <p className="text-5xl font-analytics font-light text-foreground tabular-nums tracking-tight">{value}</p>
        {sub && <p className="mt-2 text-sm text-muted-foreground font-analytics">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.05)] p-5 hover:shadow-[0_2px_12px_-3px_hsl(var(--foreground)/0.08)] transition-shadow">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-medium font-analytics tracking-wide">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-analytics font-light text-foreground tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground font-analytics">{sub}</p>}
    </div>
  );
};

export default HeroStatCard;
