'use client';

import { useMemo, memo } from 'react';
import { useSession } from '@/providers/session-provider';
import { cn } from '@/lib/utils';
import {
  chatModels,
  getAppModelDefinition,
  type AppModelId,
} from '@/lib/ai/app-models';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
import { LoginCtaBanner } from '@/components/upgrade-cta/login-cta-banner';
import {
  ModelSelectorBase,
  type ModelSelectorBaseItem,
} from '@/components/model-selector-base';
import type { AppModelDefinition } from '@/lib/ai/app-models';

export function PureModelSelector({
  selectedModelId,
  className,
  onModelChangeAction,
}: {
  selectedModelId: AppModelId;
  onModelChangeAction?: (modelId: AppModelId) => void;
  className?: string;
}) {
  const { data: session } = useSession();
  const isAnonymous = !session?.user;

  const models: Array<ModelSelectorBaseItem<AppModelId, AppModelDefinition>> =
    useMemo(() => {
      return chatModels.map((m) => {
        const def = getAppModelDefinition(m.id);
        const disabled =
          isAnonymous && !ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(m.id);
        return { id: m.id, definition: def, disabled };
      });
    }, [isAnonymous]);

  const hasDisabledModels = useMemo(
    () => models.some((m) => m.disabled),
    [models],
  );

  return (
    <ModelSelectorBase
      className={cn('w-fit md:px-2', className)}
      models={models}
      selectedModelId={selectedModelId}
      onModelChange={onModelChangeAction}
      topContent={
        hasDisabledModels ? (
          <div className="p-3">
            <LoginCtaBanner
              message="Sign in to unlock all models."
              variant="default"
              compact
            />
          </div>
        ) : null
      }
      enableFilters
    />
  );
}

export const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className &&
    prevProps.onModelChangeAction === nextProps.onModelChangeAction
  );
});
