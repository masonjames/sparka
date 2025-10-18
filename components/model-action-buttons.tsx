'use client';
import { ExternalLink, MessageSquare, Scale } from 'lucide-react';
import type React from 'react';
import type { ComponentProps } from 'react';
import type { ModelId } from '@/lib/models';
import { cn } from '@/lib/utils';
import { LinkButton } from './link-button';
import { useMemo } from 'react';

export function ChatModelButton({
  modelId,
  className,
  children,
  hideIcon,
  size,
  variant = 'default',
}: {
  modelId?: ModelId | string | null;
  className?: string;
  children?: React.ReactNode;
  hideIcon?: boolean;
  size?: ComponentProps<typeof LinkButton>['size'];
  variant?: 'default' | 'outline';
}) {
  const href = useMemo(() => {
    if (!modelId) return '';
    return `/?modelId=${encodeURIComponent(modelId)}`;
  }, [modelId]);

  return (
    <LinkButton
      className={cn('gap-2', className)}
      variant={variant}
      disabled={!modelId}
      href={href}
      size={size}
    >
      {!hideIcon ? <MessageSquare className="h-4 w-4" /> : null}
      {children ?? 'Chat'}
    </LinkButton>
  );
}

export function CompareModelButton({
  modelId,
  className,
  size,
  children,
  hideIcon,
  ...props
}: {
  modelId: string | ModelId;
  className?: string;
  size?: ComponentProps<typeof LinkButton>['size'];
  children?: React.ReactNode;
  hideIcon?: boolean;
} & Omit<ComponentProps<typeof LinkButton>, 'href'>) {
  return (
    <LinkButton
      href={`/compare/${String(modelId)}`}
      className={cn('gap-2', className)}
      size={size}
      {...props}
    >
      {!hideIcon ? <Scale className="h-4 w-4" /> : null}
      {children ?? 'Compare'}
    </LinkButton>
  );
}

export function GoToModelButton({
  modelId,
  className,
  children,
  hideIcon,
  size,
  variant = 'outline',
  ...props
}: {
  modelId: string | ModelId;
  className?: string;
  children?: React.ReactNode;
  hideIcon?: boolean;
  size?: ComponentProps<typeof LinkButton>['size'];
  variant?: ComponentProps<typeof LinkButton>['variant'];
} & Omit<ComponentProps<typeof LinkButton>, 'variant' | 'children' | 'href'>) {
  return (
    <LinkButton
      href={`/models/${String(modelId)}`}
      className={cn('gap-2', className)}
      variant={variant}
      size={size}
      {...props}
    >
      <span>{children ?? 'Go to model'}</span>
      {!hideIcon ? <ExternalLink className="ml-0 h-4 w-4" /> : null}
    </LinkButton>
  );
}
