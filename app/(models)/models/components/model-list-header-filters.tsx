'use client';

import { Button } from '@/components/ui/button';
import { SearchInput } from '@/app/(models)/models/search-input';
import { SortSelect } from '@/app/(models)/models/sort-select';
import { FilterSheet } from '@/app/(models)/models/filter-sheet';
import { RotateCcw } from 'lucide-react';
import { useModels } from '@/app/(models)/models/models-store-context';

export function ModelListHeaderFilters() {
  return (
    <>
      {/* Controls - mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        {/* First row: search bar only */}
        <ConnectedSearchInput />

        {/* Second row: filter + sort */}
        <div className="flex items-center gap-2">
          <ConnectedFilterSheet />

          <div className="grow">
            <ConnectedSortSelect />
          </div>
        </div>
      </div>

      {/* Controls - desktop */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        {/* Filters button hidden on desktop because filters are visible elsewhere */}
        <div className="flex items-center gap-2  justify-between w-full">
          <div className="flex gap-2 items-center w-full">
            <ConnectedSearchInput />
            <ConnectedSortSelect />
          </div>

          <ResetFiltersButton />
        </div>
      </div>
    </>
  );
}

function ConnectedSearchInput() {
  const value = useModels((s) => s.searchQuery);
  const setValue = useModels((s) => s.setSearchQuery);
  return (
    <SearchInput
      value={value}
      onChange={setValue}
      onClear={() => setValue('')}
    />
  );
}

function ConnectedSortSelect() {
  const value = useModels((s) => s.sortBy);
  const setValue = useModels((s) => s.setSortBy);
  return <SortSelect value={value} onChangeAction={setValue} />;
}

function ResetFiltersButton() {
  const hasActive = useModels((s) => s.hasActiveFilters());
  const reset = useModels((s) => s.resetFiltersAndSearch);
  if (!hasActive) return null;
  return (
    <Button variant="ghost" className="hidden sm:inline-flex" onClick={reset}>
      <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
    </Button>
  );
}

function ConnectedFilterSheet() {
  const activeFiltersCount = useModels((s) => s.activeFiltersCount());
  const resetFiltersAndSearch = useModels((s) => s.resetFiltersAndSearch);
  return (
    <FilterSheet
      activeFiltersCount={activeFiltersCount}
      onClearAll={resetFiltersAndSearch}
    />
  );
}
