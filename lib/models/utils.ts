import type { ImageModelId, ModelId } from '@/lib/models';

export function getModelAndProvider(modelId: ModelId | ImageModelId) {
  const [provider, model] = modelId.split('/');
  if (!provider || !model) {
    throw new Error(`Invalid model ID: ${modelId}`);
  }
  return { provider, model };
}
