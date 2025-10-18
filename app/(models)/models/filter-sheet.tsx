import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { RotateCcw, Filter as FilterIcon } from 'lucide-react';
import { ModelFilters } from '@/app/(models)/models/model-filters';

export function FilterSheet({
  onClearAll,
  activeFiltersCount,
}: {
  onClearAll: () => void;
  activeFiltersCount: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="relative">
          <FilterIcon className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-primary text-primary-foreground text-[10px] leading-4 px-0.5 text-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto">
          <ModelFilters className="p-4" />
        </div>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            onClick={onClearAll}
            className="w-full justify-center"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Clear filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
