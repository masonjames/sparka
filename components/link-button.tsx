import * as React from 'react';
import Link from 'next/link';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function LinkButton({
  className,
  variant,
  size,
  href,
  disabled,
  children,
  ...props
}: {
  className?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  href: string;
  disabled?: boolean;
  children?: React.ReactNode;
  props?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}) {
  return (
    <Link
      // @ts-expect-error - href is a valid URL
      href={href}
      className={cn(
        buttonVariants({ variant, size, className }),
        disabled && 'pointer-events-none opacity-50',
      )}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}

export { LinkButton };
