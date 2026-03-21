import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  rail?: ReactNode;
}

const AnalyticsLayout = ({ children, rail }: Props) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
    <div className="lg:col-span-8 space-y-5">{children}</div>
    {rail && (
      <div className="lg:col-span-4">
        <div className="sticky top-4 space-y-4">{rail}</div>
      </div>
    )}
  </div>
);

export default AnalyticsLayout;
