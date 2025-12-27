"use client";

import { PencilEditIcon } from "@/components/icons";
import { ProjectIcon } from "@/components/project-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectColorName, ProjectIconName } from "@/lib/project-icons";

export function ProjectConfig({
  projectName,
  projectIcon,
  projectColor,
  instructions,
  onEditInstructions,
  onRenameProject,
}: {
  projectName?: string;
  projectIcon?: ProjectIconName;
  projectColor?: ProjectColorName;
  instructions?: string | null;
  onEditInstructions: () => void;
  onRenameProject: () => void;
}) {
  return (
    <div className="space-y-4">
      {projectName && (
        <div className="flex items-center gap-2">
          {projectIcon && projectColor && (
            <ProjectIcon color={projectColor} icon={projectIcon} size={24} />
          )}
          <h1 className="font-bold text-2xl">{projectName}</h1>
          <Button
            className="h-8 w-8"
            onClick={onRenameProject}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PencilEditIcon size={16} />
            <span className="sr-only">Rename project</span>
          </Button>
        </div>
      )}

      <Card className="bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Instructions</CardTitle>
              {!instructions?.trim() && (
                <CardDescription>
                  Add instructions to tailor AI responses for this project.
                </CardDescription>
              )}
            </div>
            {instructions?.trim() ? (
              <Button
                className="h-8 w-8"
                onClick={onEditInstructions}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PencilEditIcon size={16} />
                <span className="sr-only">Edit instructions</span>
              </Button>
            ) : (
              <Button
                onClick={onEditInstructions}
                type="button"
                variant="outline"
              >
                Set instructions
              </Button>
            )}
          </div>
        </CardHeader>
        {instructions?.trim() && (
          <CardContent>
            <div className="line-clamp-3 whitespace-pre-wrap text-muted-foreground text-sm">
              {instructions}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
