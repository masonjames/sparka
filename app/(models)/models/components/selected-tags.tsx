'use client';

import { memo } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PureSelectedTags = memo(function PureSelectedTags({
  selectedModelIds,
  resolveLabel,
  onRemove,
}: {
  selectedModelIds: string[];
  resolveLabel: (id: string) => string | null;
  onRemove: (id: string) => void;
}) {
  if (selectedModelIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Selected for comparison:
      </span>
      {selectedModelIds.map((modelId) => {
        const label = resolveLabel(modelId);
        if (!label) return null;
        return (
          <Badge key={modelId} variant="secondary" className="gap-1">
            {label}
            <button
              type="button"
              onClick={() => onRemove(modelId)}
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground inline-flex items-center justify-center rounded"
              aria-label={`Remove ${label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
});
