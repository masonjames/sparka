import type { ModelId } from '@/lib/models';
import { generatedModelExtra } from './model-extra.generated';
import { manualModelExtra } from './model-extra.manual';

export interface ModelExtra {
  knowledgeCutoff?: Date;
  releaseDate: Date;
  fixedTemperature?: number;
}

export const allModelsExtra: Record<ModelId, ModelExtra> = {
  ...generatedModelExtra,
  ...manualModelExtra,
};
