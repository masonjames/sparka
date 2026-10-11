import React, { memo } from "react";

import { TableCell, TableRow } from "@/components/ui/table";
import { AVAILABLE_FEATURES } from "@/lib/features-config";
import { ModelSelectorLogo } from "@/components/model-selector-logo";

import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

const ModelRowComponent = ({
  model,
  isEnabled,
  onToggle,
}: {
  readonly model: {
    readonly id: string;
    readonly name: string;
    readonly reasoning?: boolean;
  };
  readonly isEnabled: boolean;
  readonly onToggle: (modelId: string, isEnabled: boolean) => void;
}) => {
  const ReasoningIcon = AVAILABLE_FEATURES.reasoning.icon;

  return (
    <TableRow>
      <TableCell className="w-full py-2.5 pl-0">
        <div className="flex items-center gap-2.5">
          <ModelSelectorLogo modelId={model.id} />
          <span className="text-sm font-medium">{model.name}</span>
          {/* oxlint-disable typescript/strict-boolean-expressions -- Preserve model.reasoning's exact false, null, or undefined child without moving its property read. */}
          {model.reasoning && (
            <ReasoningIcon
              aria-label={AVAILABLE_FEATURES.reasoning.description}
              className={cn(
                "text-muted-foreground size-3.5",
                isEnabled && "text-foreground"
              )}
            />
          )}
          {/* oxlint-enable typescript/strict-boolean-expressions */}
        </div>
      </TableCell>
      <TableCell className="py-2.5 pr-0">
        <Switch
          checked={isEnabled}
          onCheckedChange={() => {
            onToggle(model.id, isEnabled);
          }}
        />
      </TableCell>
    </TableRow>
  );
};

const ModelRow = memo(ModelRowComponent);

ModelRow.displayName = "PureModelRow";
export { ModelRow };
