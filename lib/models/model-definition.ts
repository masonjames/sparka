import { type ModelData, type ModelId, modelsData } from './models.generated';
import { allModelsExtra, type ModelExtra } from './model-extra';

export type ModelDefinition = ModelData & ModelExtra;

export const modelDefinitions: ModelDefinition[] = modelsData.map((model) => ({
  ...model,
  ...allModelsExtra[model.id],
}));

export const modelDefinitionMap = new Map<ModelId, ModelDefinition>(
  modelDefinitions.map((definition) => [definition.id, definition]),
);

export function getModelDefinition(modelId: ModelId): ModelDefinition {
  const definition = modelDefinitionMap.get(modelId);
  if (!definition) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }
  return definition;
}
