import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  icon?: LucideIcon;
  accentColor?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "receipt";
  cta?: { label: string; to: string };
}

const AnalyticsModule = ({ title, icon: Icon, accentColor, children, className, variant = "default", cta }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-2xl shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.05)] p-6 ${
        variant === "receipt"
          ? "bg-[hsl(40,30%,97%)] dark:bg-card"
          : "bg-card"
      } ${accentColor ? `border-l-4 ${accentColor}` : ""} ${className ?? ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-analytics">{title}</p>
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
      {children}
    </div>
  );
};

export default AnalyticsModule;
