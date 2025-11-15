"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProjectDetailsDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValue?: string;
  onSubmit: (value: string) => void | Promise<void>;
  isLoading: boolean;
}) {
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
    }
  }, [open, initialValue]);

  const handleSubmit = async () => {
    const trimmedValue = value.trim();
    if (mode === "create") {
      if (trimmedValue) {
        onSubmit(trimmedValue);
        setValue("");
      }
    } else {
      if (trimmedValue && trimmedValue !== initialValue) {
        await onSubmit(trimmedValue);
        onOpenChange(false);
      } else {
        onOpenChange(false);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setValue(initialValue ?? "");
    }
    onOpenChange(newOpen);
  };

  const isDisabled =
    mode === "create"
      ? !value.trim() || isLoading
      : !value.trim() || value.trim() === initialValue || isLoading;

  const title = mode === "create" ? "New Project" : "Rename Project";
  const description =
    mode === "create"
      ? "Create a new project to organize your chats."
      : "Enter a new name for this project.";
  const buttonText = mode === "create" ? "Create" : "Save";
  const placeholder = "Project name";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              } else if (e.key === "Escape") {
                handleOpenChange(false);
              }
            }}
            autoFocus
            maxLength={255}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

