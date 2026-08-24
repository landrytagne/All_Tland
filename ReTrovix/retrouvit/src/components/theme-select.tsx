"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Clair", description: "Thème clair", icon: Sun },
  { value: "dark", label: "Sombre", description: "Thème sombre", icon: Moon },
  { value: "system", label: "Système", description: "Selon vos préférences", icon: Monitor },
];

export function ThemeSelect({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Thème</p>
          <p className="text-xs text-muted-foreground">Sélectionnez l&apos;apparence de l&apos;application</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <div key={t.value} className="rounded-lg border p-3 opacity-50">
              <div className="flex justify-center mb-2">
                <t.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-center font-medium">{t.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Thème</p>
        <p className="text-xs text-muted-foreground">Sélectionnez l&apos;apparence de l&apos;application</p>
      </div>
      <RadioGroup
        value={theme}
        onValueChange={setTheme}
        className="grid grid-cols-3 gap-3"
      >
        {themes.map((t) => (
          <Label
            key={t.value}
            htmlFor={`theme-${t.value}`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
              theme === t.value && "border-primary bg-primary/5"
            )}
          >
            <RadioGroupItem value={t.value} id={`theme-${t.value}`} className="sr-only" />
            <t.icon className={cn("h-5 w-5", theme === t.value ? "text-primary" : "text-muted-foreground")} />
            <div className="text-center">
              <p className="text-xs font-medium">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.description}</p>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
