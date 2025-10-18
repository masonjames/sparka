'use client';

import { useMemo } from 'react';
import type { ModelDefinition } from '@/lib/models';
import type { ProviderId } from '@/lib/models';
import {
  ChatModelButton,
  CompareModelButton,
} from '@/components/model-action-buttons';
import { getProviderIcon } from '@/components/get-provider-icon';
import { MODEL_CATEGORIES } from '@/lib/model-explorer/model-categories';
import { MODEL_CAPABILITIES } from '@/lib/model-explorer/model-capabilities';
import { formatNumberCompact } from '@/lib/utils/format-number-compact';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonCopy } from '@/components/common/button-copy';

export function WideModelDetails({
  model,
  enabledActions,
}: {
  model: ModelDefinition;
  enabledActions?: {
    goToModel?: boolean;
    chat?: boolean;
    compare?: boolean;
  };
}) {
  const provider = model?.owned_by as ProviderId | undefined;
  const contextCompact = useMemo(
    () => (model ? formatNumberCompact(model.context_window) : '--'),
    [model?.id, model?.context_window],
  );

  const actions = {
    chat: true,
    compare: true,
    ...(enabledActions ?? {}),
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header: title + provider + primary actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {provider ? getProviderIcon(provider, 48) : null}
            <div className="min-w-0">
              <div className="sm:text-3xl text-2xl font-semibold tracking-tight mb-0.5">
                {model?.name ?? 'Model'}
              </div>
              <div className="text-sm text-muted-foreground font-medium capitalize">
                {`By ${provider || 'Unknown Provider'}`}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions.compare && model ? (
            <CompareModelButton
              modelId={model.id}
              variant="outline"
              size="lg"
              className="h-9 px-3"
            />
          ) : null}
          {actions.chat && model ? (
            <ChatModelButton modelId={model.id} className="h-9 px-3" size="lg">
              Chat
            </ChatModelButton>
          ) : null}
        </div>
      </div>

      {/* Release date + description */}
      <div className="space-y-1">
        <div className="flex gap-2 items-center">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <code className="font-mono truncate">{model.id}</code>
            <ButtonCopy code={model.id} className="h-6 w-6" />
          </span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-muted-foreground">
            Released{' '}
            {model.releaseDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <p className="text-sm leading-6 text-foreground">{model.description}</p>
      </div>

      {/* Pricing */}
      <ResponsiveSection
        title={MODEL_CATEGORIES.pricing.label}
        Icon={MODEL_CATEGORIES.pricing.Icon}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <KeyValue
            label="Pricing (Input)"
            value={
              model
                ? `$${(Number.parseFloat(model.pricing.input) * 1_000_000).toFixed(2)}/M tokens`
                : '--'
            }
          />
          <KeyValue
            label="Pricing (Output)"
            value={
              model
                ? `$${(Number.parseFloat(model.pricing.output) * 1_000_000).toFixed(2)}/M tokens`
                : '--'
            }
          />
          <KeyValue
            label="Caching"
            value={
              model &&
              (model.pricing.input_cache_read ||
                model.pricing.input_cache_write)
                ? 'Yes'
                : 'No'
            }
          />
        </div>
      </ResponsiveSection>

      {/* Limits */}
      <ResponsiveSection
        title={MODEL_CATEGORIES.limits.label}
        Icon={MODEL_CATEGORIES.limits.Icon}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <KeyValue label="Context Length" value={contextCompact} />
          <KeyValue
            label="Max Output Tokens"
            value={
              model?.max_tokens
                ? formatNumberCompact(Number(model.max_tokens))
                : '--'
            }
          />
        </div>
      </ResponsiveSection>

      {/* Input Modalities */}
      <ResponsiveSection
        title={MODEL_CATEGORIES.inputModalities.label}
        Icon={MODEL_CATEGORIES.inputModalities.Icon}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModalityRow
            label={MODEL_CAPABILITIES.text.label}
            enabled={!!model?.input?.text}
            Icon={MODEL_CAPABILITIES.text.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.image.label}
            enabled={!!model?.input?.image}
            Icon={MODEL_CAPABILITIES.image.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.pdf.label}
            enabled={!!model?.input?.pdf}
            Icon={MODEL_CAPABILITIES.pdf.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.audio.label}
            enabled={!!model?.input?.audio}
            Icon={MODEL_CAPABILITIES.audio.Icon}
          />
        </div>
      </ResponsiveSection>

      {/* Output Modalities */}
      <ResponsiveSection
        title={MODEL_CATEGORIES.outputModalities.label}
        Icon={MODEL_CATEGORIES.outputModalities.Icon}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModalityRow
            label={MODEL_CAPABILITIES.text.label}
            enabled={!!model?.output?.text}
            Icon={MODEL_CAPABILITIES.text.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.image.label}
            enabled={!!model?.output?.image}
            Icon={MODEL_CAPABILITIES.image.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.audio.label}
            enabled={!!model?.output?.audio}
            Icon={MODEL_CAPABILITIES.audio.Icon}
          />
        </div>
      </ResponsiveSection>

      {/* Features */}
      <ResponsiveSection
        title={MODEL_CATEGORIES.features.label}
        Icon={MODEL_CATEGORIES.features.Icon}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModalityRow
            label={MODEL_CAPABILITIES.reasoning.label}
            enabled={!!model?.reasoning}
            Icon={MODEL_CAPABILITIES.reasoning.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.tools.label}
            enabled={!!model?.toolCall}
            Icon={MODEL_CAPABILITIES.tools.Icon}
          />
          <ModalityRow
            label={MODEL_CAPABILITIES.temperature.label}
            enabled={model?.fixedTemperature === undefined}
            Icon={MODEL_CAPABILITIES.temperature.Icon}
          />
        </div>
      </ResponsiveSection>
    </div>
  );
}

function ResponsiveSection({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 pt-3 pb-4 border-b border-border/50 last:border-b-0">
      {/* Category title - left side on sm+, top on mobile */}
      <div className="flex items-start gap-2 text-base font-semibold">
        <div className="flex gap-2 items-center">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </div>
      </div>

      {/* Content - right side on sm+, below title on mobile */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-3">
      <CardContent className="px-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">{label}</span>
          <span className="text-base font-semibold tabular-nums">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ModalityRow({
  label,
  enabled,
  Icon,
}: {
  label: string;
  enabled: boolean;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-md ${
          enabled ? 'bg-muted' : 'bg-muted/40'
        }`}
      >
        <Icon
          className={`h-4 w-4 ${enabled ? '' : 'text-muted-foreground/50'}`}
        />
      </div>
      <div className="flex flex-col">
        <span
          className={`text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        <span className={`text-xs text-muted-foreground`}>
          {enabled ? 'Supported' : 'Not supported'}
        </span>
      </div>
    </div>
  );
}

// No separate FeatureRow: features reuse ModalityRow style for visual parity
