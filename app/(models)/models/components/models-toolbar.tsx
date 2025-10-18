'use client';

import { memo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type SortOption =
  | 'newest'
  | 'pricing-low'
  | 'pricing-high'
  | 'context-high'
  | 'context-low';

export const PureModelsToolbar = memo(function PureModelsToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  sortBy,
  onChangeSort,
  onClearAll,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  sortBy: SortOption;
  onChangeSort: (value: SortOption) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Select
        value={sortBy}
        onValueChange={(value: SortOption) => onChangeSort(value)}
      >
        <SelectTrigger className="h-8 w-full sm:w-40 text-xs">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent className="text-sm">
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="pricing-low">$ Low → High</SelectItem>
          <SelectItem value="pricing-high">$ High → Low</SelectItem>
          <SelectItem value="context-high">Context High → Low</SelectItem>
          <SelectItem value="context-low">Context Low → High</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" className="shrink-0" onClick={onClearAll}>
        <RotateCcw className="mr-2 h-4 w-4" /> Reset
      </Button>
    </div>
  );
});
