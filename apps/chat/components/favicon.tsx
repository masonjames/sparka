import type React from "react";

import { cn } from "@/lib/utils";

export const Favicon = ({
  url,
  className,
  ...props
}: {
  readonly url: string;
  readonly className?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>): React.JSX.Element => (
  // oxlint-disable-next-line next/no-img-element -- Favicon forwards React.ImgHTMLAttributes, including caller srcSet and string dimensions; installed Next Image drops srcSet and rejects percentage widths even when unoptimized. Preserve this native attribute contract.
  <img
    className={cn("h-4 w-4", className)}
    height={16}
    src={url}
    width={16}
    {...props}
    alt={`Favicon for ${url}`}
    onError={(event) => {
      const target = event.currentTarget;
      target.style.display = "none";
      target.nextElementSibling?.classList.remove("hidden");
    }}
  />
);
