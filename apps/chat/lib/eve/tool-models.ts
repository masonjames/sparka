import { getActiveGateway } from "@/lib/ai/active-gateway";
import type { InstalledGateway } from "@/lib/ai/gateways/registry";
import type { ToolModelProvider } from "@/lib/ai/tool-context";

import { loadEveModelDefinition } from "./model-selection";

export const eveToolModelProvider: ToolModelProvider = {
  createImageModel: (modelId) => {
    const gateway = getActiveGateway();
    const model = gateway.createImageModel(
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion -- OpenAI's generated scaffold requires OpenaiImageModelId, while EVE supplies a runtime string. The cast preserves installed-app type checking, and its unsafe-rule exception is required when the generated gateway narrows the accepted ID (verified by packages/cli test:gateways).
      modelId as Parameters<InstalledGateway["createImageModel"]>[0]
    );
    if (model === null) {
      throw new Error(
        `Gateway '${gateway.type}' does not support dedicated image models. Use a multimodal language model instead.`
      );
    }
    return model;
  },
  createLanguageModel: (modelId) =>
    getActiveGateway().createLanguageModel(modelId),
  createVideoModel: (modelId) => {
    const gateway = getActiveGateway();
    const model = gateway.createVideoModel(
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion -- OpenAI-compatible's generated scaffold types unsupported video IDs as never, while EVE supplies a runtime string. The cast preserves installed-app type checking, and its unsafe-rule exception is required when the generated gateway narrows the accepted ID (verified by packages/cli test:gateways).
      modelId as Parameters<InstalledGateway["createVideoModel"]>[0]
    );
    if (model === null) {
      throw new Error(
        `Gateway '${gateway.type}' does not support video models.`
      );
    }
    return model;
  },
  getModelDefinition: async (modelId) => {
    const model = await loadEveModelDefinition(modelId);
    return {
      apiModelId: model.apiModelId,
      // The EVE catalog and active gateway validate the runtime ID at this boundary.
      id: model.id,
      output: model.output,
    };
  },
};
