import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Building, CheckCircle } from 'lucide-react';
import type { ModelDefinition } from '@/lib/models';
import type { ProviderId } from '@/lib/models';
import { cn } from '@/lib/utils';
import { getFeatureConfig, isFeatureEnabled } from '@/lib/features-config';
import { getProviderIcon } from './get-provider-icon';
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

const PlaceholderIcon = () => <Building className="size-6" />;

const getFeatureIconsForCard = (model: ModelDefinition) => {
  const icons: React.ReactNode[] = [];

  // Check for reasoning capability
  if (model.reasoning && isFeatureEnabled('reasoning')) {
    const config = getFeatureConfig('reasoning');
    if (config?.icon) {
      const IconComponent = config.icon;
      icons.push(
        <Tooltip key="reasoning">
          <TooltipTrigger asChild>
            <div className="p-1.5 bg-muted rounded">
              <IconComponent className="size-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>,
      );
    }
  }

  return icons;
};

export function ModelCard({
  model,
  isSelected,
  isDisabled,
  disabledReason,
  className,
}: {
  model: ModelDefinition;
  isSelected?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const provider = model.owned_by as ProviderId;
  const description = model.description;
  const maxTokens = model.max_tokens;
  const contextLength = model.context_window;

  // Show placeholder if disabled with reason
  if (isDisabled && disabledReason) {
    return (
      <Card
        className={cn(
          'cursor-not-allowed opacity-50',
          'bg-muted/50',
          className,
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="transition-transform bg-muted rounded-lg p-1">
              <PlaceholderIcon />
            </div>
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">
                {model.name}
              </CardTitle>
              <CardDescription className="capitalize">
                {provider}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center w-full">
            {disabledReason}
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
        isDisabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="transition-transform bg-muted rounded-lg p-1 group-hover:rotate-12">
            {getProviderIcon(provider, 24)}
          </div>
          <div className="text-left">
            <CardTitle className="text-sm font-semibold">
              {model.name}
            </CardTitle>
            <CardDescription className="capitalize">{provider}</CardDescription>
          </div>
        </div>
        {isSelected && (
          <CardAction>
            <CheckCircle className="size-4 text-primary" />
          </CardAction>
        )}
      </CardHeader>

      {description && (
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 text-left">
            {description}
          </p>
        </CardContent>
      )}

      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-[11px] sm:text-xs text-muted-foreground text-start">
          {maxTokens && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{maxTokens.toLocaleString()}</span>
              <span className="hidden sm:inline">Max out</span>
              <span className="sm:hidden uppercase tracking-wide text-[10px] text-muted-foreground/80">
                out
              </span>
            </div>
          )}
          {maxTokens && contextLength && (
            <div className="hidden sm:block h-3 w-px bg-border/60" />
          )}
          {contextLength && (
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {contextLength.toLocaleString()}
              </span>
              <span className="hidden sm:inline">Max in</span>
              <span className="sm:hidden uppercase tracking-wide text-[10px] text-muted-foreground/80">
                in
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-3 w-full">
          {model.reasoning && (
            <Badge variant="outline" className="text-xs">
              Reasoning
            </Badge>
          )}
          {model.toolCall && (
            <Badge variant="outline" className="text-xs">
              Function Calling
            </Badge>
          )}
          {model.input?.image && (
            <Badge variant="outline" className="text-xs">
              Vision
            </Badge>
          )}
          {model.input?.pdf && (
            <Badge variant="outline" className="text-xs">
              PDF
            </Badge>
          )}
        </div>
      </CardContent>

      {model.pricing && (
        <CardFooter>
          <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
            {model.pricing.input && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span>
                  ${(Number(model.pricing.input) * 1000000).toFixed(2)}/1M in
                </span>
              </div>
            )}
            {model.pricing.output && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span>
                  ${(Number(model.pricing.output) * 1000000).toFixed(2)}/1M out
                </span>
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );

  if (isDisabled) {
    return cardContent;
  }

  return <TooltipProvider>{cardContent}</TooltipProvider>;
}
