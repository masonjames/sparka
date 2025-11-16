"use client";
import type { ProviderId } from "@airegistry/vercel-gateway";
import {
  Alibaba,
  Anthropic,
  Aws,
  Cohere,
  DeepSeek,
  Gemini,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  OpenAI,
  Perplexity,
  Vercel,
  XAI,
  ZAI,
} from "@lobehub/icons";
import { HatGlasses } from "lucide-react";

export function getProviderIcon(
  provider: ProviderId,
  size = 16
): React.ReactNode {
  const iconProps = { size };
  switch (provider) {
    case "openai":
      return <OpenAI {...iconProps} />;
    case "anthropic":
      return <Anthropic {...iconProps} />;
    case "xai":
      return <XAI {...iconProps} />;
    case "google":
      return <Gemini {...iconProps} />;
    case "meta":
      return <Meta {...iconProps} />;
    case "mistral":
      return <Mistral {...iconProps} />;
    case "alibaba":
      return <Alibaba {...iconProps} />;
    case "amazon":
      return <Aws {...iconProps} />;
    case "cohere":
      return <Cohere {...iconProps} />;
    case "deepseek":
      return <DeepSeek {...iconProps} />;
    case "perplexity":
      return <Perplexity {...iconProps} />;
    case "vercel":
      return <Vercel {...iconProps} />;
    case "inception":
      return <OpenAI {...iconProps} />; // Using OpenAI as fallback
    case "moonshotai":
      return <Moonshot {...iconProps} />;
    case "zai":
      return <ZAI {...iconProps} />;
    case "stealth":
      return <HatGlasses {...iconProps} />;
    case "minimax":
      return <Minimax {...iconProps} />;
    case "morph":
    case "meituan":
      return null;
    default:
      return null;
  }
}
