"use client";

import { DollarSign } from "lucide-react";
import { useGetCredits } from "./use-credits";

const CREDIT_UNITS_PER_DOLLAR = 100;
const CREDIT_DISPLAY_DECIMAL_PLACES = 2;
export const CreditBalance = () => {
  const { credits } = useGetCredits();
  return (
    <span className="flex items-center gap-1 truncate text-xs">
      <DollarSign className="size-3" />
      {((credits ?? 0) / CREDIT_UNITS_PER_DOLLAR).toFixed(
        CREDIT_DISPLAY_DECIMAL_PLACES
      )}
    </span>
  );
};
