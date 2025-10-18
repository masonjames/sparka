'use client';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  ChatModelButton,
  CompareModelButton,
} from '@/components/model-action-buttons';
import type { ModelDefinition } from '@/lib/models';
import type { ProviderId } from '@/lib/models';
import { getProviderIcon } from '@/components/get-provider-icon';
import { MODEL_CAPABILITIES } from '@/lib/model-explorer/model-capabilities';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LazyTooltip } from '@/components/lazy-tooltip';
import { memo, type ComponentType, type SVGProps } from 'react';
import { formatNumberCompact } from '../../../lib/utils/format-number-compact';
import Link from 'next/link';

function ModalityIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <LazyTooltip content={label}>
      <div
        className={`size-6 rounded-md grid place-items-center border text-foreground/80 bg-muted`}
      >
        {children}
      </div>
    </LazyTooltip>
  );
}

function ModalityIconLegacy({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`size-6 rounded-md grid place-items-center border text-foreground/80 bg-muted`}
          aria-label={label}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CapabilityIcon({
  label,
  Icon,
}: {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <ModalityIcon label={label}>
      <Icon className="size-3.5" />
    </ModalityIcon>
  );
}

function PureModelCard({
  model,
}: {
  model: ModelDefinition;
}) {
  const provider = model.owned_by as ProviderId;
  const hasInput = Boolean(
    model.input?.text ||
      model.input?.image ||
      model.input?.pdf ||
      model.input?.audio,
  );
  const hasOutput = Boolean(
    model.output?.text || model.output?.image || model.output?.audio,
  );

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 cursor-pointer gap-4 relative">
      <Link
        href={`/models/${model.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Open ${model.name}`}
        tabIndex={-1}
      >
        <span className="sr-only">Open {model.name}</span>
      </Link>
      <CardHeader className="">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-muted rounded-lg size-10 grid place-items-center">
              {getProviderIcon(provider, 28)}
            </div>
            <div className="">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-balance">
                {model.name}
              </h3>
              <span className="text-sm text-muted-foreground">
                by {model.owned_by.toLowerCase()}
              </span>
            </div>
          </div>
          <div className="shrink-0 hidden sm:flex items-center gap-2 relative z-20">
            <CompareModelButton
              modelId={model.id}
              variant="outline"
              size="sm"
              className="transition-all duration-200"
            />
            <ChatModelButton
              modelId={model.id}
              size="sm"
              className="transition-all duration-200"
            />
          </div>
        </div>
        {/* Secondary info row below the header line */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span>
            Context{' '}
            <span className="font-medium text-foreground">
              {formatNumberCompact(model.context_window)}
            </span>
          </span>
          <span>•</span>
          <span>
            Max out{' '}
            <span className="font-medium text-foreground">
              {formatNumberCompact(model.max_tokens)}
            </span>
          </span>
          <span>•</span>
          <span>
            Input{' '}
            <span className="font-medium text-foreground">
              ${(Number.parseFloat(model.pricing.input) * 1_000_000).toFixed(2)}
              /M
            </span>
          </span>
          <span>•</span>
          <span>
            Output{' '}
            <span className="font-medium text-foreground">
              $
              {(Number.parseFloat(model.pricing.output) * 1_000_000).toFixed(2)}
              /M
            </span>
          </span>
          <span>•</span>
          <span>
            Released{' '}
            <span className="font-medium text-foreground">
              {model.releaseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="gap-3 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 text-pretty leading-relaxed">
          {model.description}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 sm:gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 min-w-0">
            {hasInput && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Input</span>
                <div className="flex items-center gap-1.5">
                  {model.input?.text && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.text.label} in`}
                      Icon={MODEL_CAPABILITIES.text.Icon}
                    />
                  )}
                  {model.input?.image && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.image.label} in`}
                      Icon={MODEL_CAPABILITIES.image.Icon}
                    />
                  )}
                  {model.input?.pdf && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.pdf.label} in`}
                      Icon={MODEL_CAPABILITIES.pdf.Icon}
                    />
                  )}
                  {model.input?.audio && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.audio.label} in`}
                      Icon={MODEL_CAPABILITIES.audio.Icon}
                    />
                  )}
                </div>
              </div>
            )}
            {hasInput && hasOutput && (
              <span className="hidden sm:inline text-muted-foreground/40">
                /
              </span>
            )}
            {hasOutput && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Output</span>
                <div className="flex items-center gap-1.5">
                  {model.output?.text && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.text.label} out`}
                      Icon={MODEL_CAPABILITIES.text.Icon}
                    />
                  )}
                  {model.output?.image && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.image.label} out`}
                      Icon={MODEL_CAPABILITIES.image.Icon}
                    />
                  )}
                  {model.output?.audio && (
                    <CapabilityIcon
                      label={`${MODEL_CAPABILITIES.audio.label} out`}
                      Icon={MODEL_CAPABILITIES.audio.Icon}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {(model.reasoning ||
            model.toolCall ||
            model.fixedTemperature === undefined) && (
            <>
              <span className="hidden sm:inline text-muted-foreground/40">
                /
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Features</span>
                <div className="flex items-center gap-1.5">
                  {model.reasoning && (
                    <CapabilityIcon
                      label={MODEL_CAPABILITIES.reasoning.label}
                      Icon={MODEL_CAPABILITIES.reasoning.Icon}
                    />
                  )}
                  {model.toolCall && (
                    <CapabilityIcon
                      label={MODEL_CAPABILITIES.tools.label}
                      Icon={MODEL_CAPABILITIES.tools.Icon}
                    />
                  )}
                  {model.fixedTemperature === undefined && (
                    <CapabilityIcon
                      label={MODEL_CAPABILITIES.temperature.label}
                      Icon={MODEL_CAPABILITIES.temperature.Icon}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="sm:hidden pt-0">
        <div className="w-full flex items-center justify-end gap-2 relative z-20">
          <CompareModelButton
            modelId={model.id}
            variant="outline"
            size="sm"
            className="transition-all duration-200 grow"
          />
          <ChatModelButton
            modelId={model.id}
            className="transition-all duration-200 grow"
          />
        </div>
      </CardFooter>
    </Card>
  );
}

export const ModelCard = memo(
  PureModelCard,
  (prevProps, nextProps) => prevProps.model.id === nextProps.model.id,
);
