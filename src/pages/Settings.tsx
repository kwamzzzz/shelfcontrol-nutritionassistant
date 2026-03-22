import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Bell, Palette, Database } from "lucide-react";

const Settings = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">App preferences and configuration</p>
      </div>

      {[
        { icon: Bell, title: "Notifications", desc: "Configure expiry alerts, shopping reminders, and group notifications." },
        { icon: Palette, title: "Appearance", desc: "Theme, layout density, and display preferences." },
        { icon: Database, title: "Data & Privacy", desc: "Export your data, manage storage, and review privacy settings." },
      ].map(({ icon: Icon, title, desc }) => (
        <Card key={title} className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{desc}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">Coming soon</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Settings;
