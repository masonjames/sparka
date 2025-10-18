'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useModels } from '../models-store-context';

export const PureEmptyState = memo(function PureEmptyState() {
  const reset = useModels((s) => s.resetFiltersAndSearch);

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">
        No models found matching your criteria.
      </p>
      <Button variant="outline" onClick={reset}>
        Clear all filters
      </Button>
    </div>
  );
});
