import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Palette, Database, Mail, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getDisposalConfirmationEnabled,
  setDisposalConfirmationEnabled,
} from "@/lib/pantry-exit-preferences";

const Settings = () => {
  const [confirmDisposal, setConfirmDisposal] = useState(getDisposalConfirmationEnabled);

  const updateDisposalConfirmation = (enabled: boolean) => {
    setConfirmDisposal(enabled);
    setDisposalConfirmationEnabled(enabled);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">App preferences and configuration</p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trash2 className="h-5 w-5 text-destructive" />
            Pantry actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-5 rounded-2xl border border-border/70 bg-muted/35 p-4">
            <div>
              <label htmlFor="confirm-disposal" className="font-medium text-foreground">
                Confirm before disposing
              </label>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Show the confirmation and optional date, amount and reason before a single item leaves your pantry.
                Bulk disposal always asks.
              </p>
            </div>
            <Switch
              id="confirm-disposal"
              checked={confirmDisposal}
              onCheckedChange={updateDisposalConfirmation}
              aria-label="Confirm before disposing pantry items"
            />
          </div>
        </CardContent>
      </Card>

      {[
        { icon: Mail, title: "Monthly Pantry Report", desc: "Receive your spend by month, store breakdown, most-bought foods, and waste summary by email." },
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
