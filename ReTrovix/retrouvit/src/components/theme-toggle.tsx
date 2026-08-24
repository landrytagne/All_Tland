"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={cn("h-9 w-9 rounded-xl", className)} disabled>
        <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "h-9 w-9 rounded-xl relative overflow-hidden group",
            "hover:bg-orange-brand/10 hover:text-orange-brand",
            "transition-all duration-300",
            className
          )}
        >
          {/* Sun icon */}
          <Sun
            className={cn(
              "h-4 w-4 absolute transition-all duration-500 ease-out",
              theme === "dark"
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            )}
          />
          {/* Moon icon */}
          <Moon
            className={cn(
              "h-4 w-4 absolute transition-all duration-500 ease-out",
              theme === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0"
            )}
          />
          {/* System icon (shown when system is selected) */}
          {theme === "system" && (
            <Monitor className="h-4 w-4 absolute" />
          )}
          {/* Pulse ring on hover */}
          <span className="absolute inset-0 rounded-xl ring-2 ring-orange-brand/0 group-hover:ring-orange-brand/20 transition-all duration-300" />
          {showLabel && (
            <span className="ml-2 text-sm">
              {theme === "light" ? "Clair" : theme === "dark" ? "Sombre" : "Système"}
            </span>
          )}
          <span className="sr-only">Changer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "gap-2.5 rounded-lg cursor-pointer",
            theme === "light" && "bg-orange-brand/10 text-orange-brand font-medium"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
            theme === "light" ? "bg-orange-brand/20" : "bg-muted"
          )}>
            <Sun className="h-3.5 w-3.5" />
          </div>
          Clair
          {theme === "light" && <span className="ml-auto text-orange-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "gap-2.5 rounded-lg cursor-pointer",
            theme === "dark" && "bg-forest/10 dark:bg-forest-light/10 text-forest dark:text-forest-light font-medium"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
            theme === "dark" ? "bg-forest/20 dark:bg-forest-light/20" : "bg-muted"
          )}>
            <Moon className="h-3.5 w-3.5" />
          </div>
          Sombre
          {theme === "dark" && <span className="ml-auto text-forest dark:text-forest-light">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "gap-2.5 rounded-lg cursor-pointer",
            theme === "system" && "bg-muted font-medium"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
            theme === "system" ? "bg-muted" : "bg-muted/50"
          )}>
            <Monitor className="h-3.5 w-3.5" />
          </div>
          Système
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple animated toggle — cycles light → dark → system
 */
export function ThemeToggleSimple({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl", className)} disabled>
        <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  const toggleTheme = () => {
    setIsAnimating(true);
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 rounded-xl relative overflow-hidden group",
        "hover:bg-orange-brand/10 hover:text-orange-brand",
        "transition-all duration-300",
        className
      )}
      onClick={toggleTheme}
    >
      {/* Background glow on switch */}
      <span
        className={cn(
          "absolute inset-0 rounded-xl transition-all duration-500",
          isAnimating && "bg-orange-brand/10"
        )}
      />

      {/* Sun */}
      <Sun
        className={cn(
          "h-4 w-4 absolute transition-all duration-500 ease-out",
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        )}
      />

      {/* Moon */}
      <Moon
        className={cn(
          "h-4 w-4 absolute transition-all duration-500 ease-out",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        )}
      />

      {/* Pulse ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-xl ring-2 ring-orange-brand/0",
          "group-hover:ring-orange-brand/20 transition-all duration-300"
        )}
      />

      <span className="sr-only">Changer le thème</span>
    </Button>
  );
}
