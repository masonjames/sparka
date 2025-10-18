'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortOption } from '@/app/(models)/models/models-store-context';

export function SortSelect({
  value,
  onChangeAction,
  className,
}: {
  value: SortOption;
  onChangeAction: (value: SortOption) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v: SortOption) => onChangeAction(v)}>
      <SelectTrigger className={`max-w-40 ${className ?? ''}`}>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent className="text-sm">
        <SelectItem value="newest">Newest</SelectItem>
        <SelectItem value="pricing-high">Pricing (High → Low)</SelectItem>
        <SelectItem value="pricing-low">Pricing (Low → High)</SelectItem>
        <SelectItem value="context-high">Context (High → Low)</SelectItem>
        <SelectItem value="max-output-tokens-high">
          Max Output (High → Low)
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
