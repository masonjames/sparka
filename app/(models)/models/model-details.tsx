'use client';
import { cn } from '@/lib/utils';
import { ModelDetailsCard } from '@/app/(models)/compare/model-details-card';
import { getModelDefinition } from '@/lib/models';
import { allModels } from '@/lib/models';
import type { ModelDefinition } from '@/lib/models';
import { ModelSelectorBase } from '@/components/model-selector-base';
import { ChatModelButton } from '@/components/model-action-buttons';

export function ModelDetails({
  className,
  modelDefinition,
  onModelChangeAction,
  enabledActions,
}: {
  className?: string;
  modelDefinition: ModelDefinition | null;
  onModelChangeAction: (nextId: string) => void;
  enabledActions?: {
    goToModel?: boolean;
    chat?: boolean;
    compare?: boolean;
  };
}) {
  return (
    <>
      <div
        className={cn(
          'mb-6 flex flex-col gap-4 w-full max-w-[450px] ',
          className,
        )}
      >
        <div className="flex items-center gap-2 ">
          <ModelSelectorBase
            models={allModels.map((m) => ({
              id: m.id,
              definition: getModelDefinition(m.id),
            }))}
            selectedModelId={modelDefinition?.id}
            onModelChange={onModelChangeAction}
            className="border text-base bg-card h-9 w-fit shrink grow truncate"
            enableFilters
            initialChevronDirection="down"
          />
          {enabledActions?.chat ? (
            <ChatModelButton
              modelId={modelDefinition?.id}
              className="h-9 px-3 whitespace-nowrap"
              variant="default"
              size="sm"
            >
              Chat
            </ChatModelButton>
          ) : null}
        </div>
        <ModelDetailsCard
          model={modelDefinition}
          enabledActions={enabledActions}
        />
      </div>
    </>
  );
}
