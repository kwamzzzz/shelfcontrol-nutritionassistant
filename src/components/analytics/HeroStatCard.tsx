import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  variant?: "dominant" | "standard";
  accentClass?: string;
  cta?: { label: string; to: string };
}

const HeroStatCard = ({ icon: Icon, label, value, sub, variant = "standard", accentClass, cta }: Props) => {
  const navigate = useNavigate();

  if (variant === "dominant") {
    return (
      <div className={`rounded-2xl bg-card shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] p-8 ${accentClass ?? ""}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold font-analytics tracking-wide">{label}</p>
          </div>
          {cta && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold font-analytics text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => navigate(cta.to)}
            >
              {cta.label} →
            </Button>
          )}
        </div>
        <p className="text-5xl font-analytics font-semibold text-foreground tabular-nums tracking-tight">{value}</p>
        {sub && <p className="mt-2 text-sm text-muted-foreground font-analytics">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.05)] p-5 hover:shadow-[0_2px_12px_-3px_hsl(var(--foreground)/0.08)] transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <p className="text-xs font-semibold font-analytics tracking-wide">{label}</p>
        </div>
        {cta && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] font-semibold font-analytics text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => navigate(cta.to)}
          >
            {cta.label} →
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-2xl font-analytics font-semibold text-foreground tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground font-analytics">{sub}</p>}
    </div>
  );
};

export default HeroStatCard;
