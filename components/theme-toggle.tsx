"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="h-8 w-auto">
      <Button
        className="group"
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
        variant="ghost"
      >
        {resolvedTheme === "light" ? (
          <Moon className="dark:-rotate-90 h-6 w-6 rotate-0 scale-100 transition-all hover:text-foreground group-hover:text-foreground" />
        ) : (
          <Sun className="dark:-rotate-90 h-6 w-6 rotate-0 scale-100 transition-all hover:text-foreground dark:group-hover:text-foreground" />
        )}
      </Button>
    </div>
  );
};
