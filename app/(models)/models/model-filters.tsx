'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { providers } from '@/lib/models';
import { cn } from '@/lib/utils';
import { MODEL_CATEGORIES } from '@/lib/model-explorer/model-categories';
import { formatNumberCompact } from '@/lib/utils/format-number-compact';
import { useModels } from '@/app/(models)/models/models-store-context';
import { MODEL_RANGE_LIMITS } from '@/app/(models)/models/models-store-context';

export type FilterState = {
  inputModalities: string[];
  outputModalities: string[];
  contextLength: [number, number];
  inputPricing: [number, number];
  outputPricing: [number, number];
  maxTokens: [number, number];
  providers: string[];
  features: {
    reasoning?: boolean;
    toolCall?: boolean;
    temperatureControl?: boolean; // true => supports adjustable temperature
  };
  // legacy fields kept for compatibility
  series: string[];
  categories: string[];
  supportedParameters: string[];
};

function InputModalitiesFilter() {
  const inputModalities = useModels((s) => s.filters.inputModalities);
  const updateFilters = useModels((s) => s.updateFilters);

  const toggle = (modality: string, checked: boolean) => {
    const next = checked
      ? [...inputModalities, modality]
      : inputModalities.filter((m) => m !== modality);
    updateFilters({ inputModalities: next });
  };

  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-2">
      {['text', 'image', 'audio', 'pdf', 'video'].map((modality) => (
        <div key={modality} className="flex items-center space-x-2">
          <Checkbox
            id={`input-${modality}`}
            checked={inputModalities.includes(modality)}
            onCheckedChange={(checked) => toggle(modality, !!checked)}
          />
          <label
            htmlFor={`input-${modality}`}
            className="text-sm capitalize cursor-pointer"
          >
            {modality}
          </label>
        </div>
      ))}
    </CollapsibleContent>
  );
}

function OutputModalitiesFilter() {
  const outputModalities = useModels((s) => s.filters.outputModalities);
  const updateFilters = useModels((s) => s.updateFilters);

  const toggle = (modality: string, checked: boolean) => {
    const next = checked
      ? [...outputModalities, modality]
      : outputModalities.filter((m) => m !== modality);
    updateFilters({ outputModalities: next });
  };

  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-2">
      {['text', 'image', 'audio'].map((modality) => (
        <div key={modality} className="flex items-center space-x-2">
          <Checkbox
            id={`output-${modality}`}
            checked={outputModalities.includes(modality)}
            onCheckedChange={(checked) => toggle(modality, !!checked)}
          />
          <label
            htmlFor={`output-${modality}`}
            className="text-sm capitalize cursor-pointer"
          >
            {modality}
          </label>
        </div>
      ))}
    </CollapsibleContent>
  );
}

function LimitsFilter() {
  const contextLength = useModels((s) => s.filters.contextLength);
  const maxTokens = useModels((s) => s.filters.maxTokens);
  const updateFilters = useModels((s) => s.updateFilters);
  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-4">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Context length (tokens)
        </div>
        <Slider
          value={contextLength}
          onValueChange={(value) =>
            updateFilters({ contextLength: value as [number, number] })
          }
          max={MODEL_RANGE_LIMITS.context[1]}
          min={MODEL_RANGE_LIMITS.context[0]}
          step={1000}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatNumberCompact(contextLength[0])}</span>
          <span>{formatNumberCompact(contextLength[1])}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Max output tokens (tokens)
        </div>
        <Slider
          value={maxTokens}
          onValueChange={(value) =>
            updateFilters({ maxTokens: value as [number, number] })
          }
          max={MODEL_RANGE_LIMITS.maxTokens[1]}
          min={MODEL_RANGE_LIMITS.maxTokens[0]}
          step={512}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatNumberCompact(maxTokens[0])}</span>
          <span>{formatNumberCompact(maxTokens[1])}</span>
        </div>
      </div>
    </CollapsibleContent>
  );
}

function ProvidersFilter() {
  const selectedProviders = useModels((s) => s.filters.providers);
  const updateFilters = useModels((s) => s.updateFilters);
  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-2">
      {providers.map((provider) => (
        <div key={provider} className="flex items-center space-x-2">
          <Checkbox
            id={`provider-${provider}`}
            checked={selectedProviders.includes(provider)}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...selectedProviders, provider]
                : selectedProviders.filter((p) => p !== provider);
              updateFilters({ providers: next });
            }}
          />
          <label
            htmlFor={`provider-${provider}`}
            className="text-sm capitalize cursor-pointer"
          >
            {provider}
          </label>
        </div>
      ))}
    </CollapsibleContent>
  );
}

function PricingFilter() {
  const inputPricing = useModels((s) => s.filters.inputPricing);
  const outputPricing = useModels((s) => s.filters.outputPricing);
  const updateFilters = useModels((s) => s.updateFilters);
  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-4">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Input price ($/1M tokens)
        </div>
        <Slider
          value={inputPricing}
          onValueChange={(value) =>
            updateFilters({ inputPricing: value as [number, number] })
          }
          max={MODEL_RANGE_LIMITS.inputPricing[1]}
          min={MODEL_RANGE_LIMITS.inputPricing[0]}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${inputPricing[0].toFixed(2)}</span>
          <span>${inputPricing[1].toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Output price ($/1M tokens)
        </div>
        <Slider
          value={outputPricing}
          onValueChange={(value) =>
            updateFilters({ outputPricing: value as [number, number] })
          }
          max={MODEL_RANGE_LIMITS.outputPricing[1]}
          min={MODEL_RANGE_LIMITS.outputPricing[0]}
          step={0.01}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${outputPricing[0].toFixed(2)}</span>
          <span>${outputPricing[1].toFixed(2)}</span>
        </div>
      </div>
    </CollapsibleContent>
  );
}

function FeaturesFilter() {
  const features = useModels((s) => s.filters.features);
  const updateFilters = useModels((s) => s.updateFilters);
  const toggle = (
    key: 'reasoning' | 'toolCall' | 'temperatureControl',
    checked: boolean,
  ) => {
    updateFilters({ features: { ...features, [key]: !!checked } });
  };
  return (
    <CollapsibleContent className="pt-3 pb-2 space-y-2">
      {[
        { key: 'reasoning', label: 'Reasoning' },
        { key: 'toolCall', label: 'Tools' },
        { key: 'temperatureControl', label: 'Temperature control' },
      ].map((f) => (
        <div key={f.key} className="flex items-center space-x-2">
          <Checkbox
            id={`feature-${f.key}`}
            checked={
              !!features[
                f.key as 'reasoning' | 'toolCall' | 'temperatureControl'
              ]
            }
            onCheckedChange={(checked) =>
              toggle(
                f.key as 'reasoning' | 'toolCall' | 'temperatureControl',
                !!checked,
              )
            }
          />
          <label
            htmlFor={`feature-${f.key}`}
            className="text-sm cursor-pointer"
          >
            {f.label}
          </label>
        </div>
      ))}
    </CollapsibleContent>
  );
}

export function ModelFilters({ className }: { className?: string }) {
  const [openSections, setOpenSections] = useState({
    inputModalities: true,
    outputModalities: true,
    limits: true,
    pricing: true,
    providers: true,
    features: true,
    supportedParameters: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={cn('w-full h-full p-4 bg-background border-r', className)}>
      <div className="sticky top-4 space-y-4 pr-2">
        <Collapsible
          open={openSections.inputModalities}
          onOpenChange={() => toggleSection('inputModalities')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.inputModalities.Icon className="h-4 w-4 text-muted-foreground" />
              <span>Input Modalities</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.inputModalities ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <InputModalitiesFilter />
        </Collapsible>

        <Collapsible
          open={openSections.outputModalities}
          onOpenChange={() => toggleSection('outputModalities')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.outputModalities.Icon className="h-4 w-4 text-muted-foreground" />
              <span>Output Modalities</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.outputModalities ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <OutputModalitiesFilter />
        </Collapsible>

        <Collapsible
          open={openSections.limits}
          onOpenChange={() => toggleSection('limits')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.limits.Icon className="h-4 w-4 text-muted-foreground" />
              <span>Limits</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.limits ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <LimitsFilter />
        </Collapsible>

        <Collapsible
          open={openSections.providers}
          onOpenChange={() => toggleSection('providers')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.providers.Icon className="h-4 w-4 text-muted-foreground" />
              <span>Providers</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.providers ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <ProvidersFilter />
        </Collapsible>

        <Collapsible
          open={openSections.pricing}
          onOpenChange={() => toggleSection('pricing')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.pricing.Icon className="h-4 w-4 text-muted-foreground" />
              <span>{MODEL_CATEGORIES.pricing.label}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.pricing ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <PricingFilter />
        </Collapsible>

        <Collapsible
          open={openSections.features}
          onOpenChange={() => toggleSection('features')}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium hover:text-primary transition-colors border-b">
            <div className="flex items-center gap-2">
              <MODEL_CATEGORIES.features.Icon className="h-4 w-4 text-muted-foreground" />
              <span>Features</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${openSections.features ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <FeaturesFilter />
        </Collapsible>
      </div>
    </div>
  );
}
