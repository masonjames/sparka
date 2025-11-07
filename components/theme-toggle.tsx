"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="h-8 w-auto">
      <Button
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
        variant="ghost"
        className="group"
      >
        {resolvedTheme === "light" ? (
          <Moon className="h-6 w-6 rotate-0 scale-100 transition-all hover:text-foreground group-hover:text-foreground dark:-rotate-90" />
        ) : (
          <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:group-hover:text-foreground hover:text-foreground dark:-rotate-90" />
        )}
      </Button>
    </div>
  );
};
