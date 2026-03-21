import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  icon?: LucideIcon;
  accentColor?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "receipt";
}

const AnalyticsModule = ({ title, icon: Icon, accentColor, children, className, variant = "default" }: Props) => (
  <div
    className={`rounded-2xl shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.05)] p-6 ${
      variant === "receipt"
        ? "bg-[hsl(40,30%,97%)] dark:bg-card"
        : "bg-card"
    } ${accentColor ? `border-l-4 ${accentColor}` : ""} ${className ?? ""}`}
  >
    <div className="flex items-center gap-2.5 mb-4">
      {Icon && (
        <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-analytics">{title}</p>
    </div>
    {children}
  </div>
);

export default AnalyticsModule;
