import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  icon?: LucideIcon;
  accentColor?: string; // tailwind border-l color class e.g. "border-l-warning"
  children: ReactNode;
  className?: string;
}

const AnalyticsModule = ({ title, icon: Icon, accentColor, children, className }: Props) => (
  <div className={`rounded-2xl bg-card shadow-sm p-6 ${accentColor ? `border-l-4 ${accentColor}` : ""} ${className ?? ""}`}>
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
    </div>
    {children}
  </div>
);

export default AnalyticsModule;
