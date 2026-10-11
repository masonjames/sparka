"use client";

import type {
  ComponentProps as ReactComponentProps,
  MouseEventHandler as ReactMouseEventHandler,
} from "react";

import Link from "next/link";
import React from "react";

import type { Route } from "next";

import { isElectronRenderer } from "@/lib/electron-auth";

import { useRouter } from "next/navigation";

const PRIMARY_MOUSE_BUTTON = 0;
const AUXILIARY_MOUSE_BUTTON = 1;

type InternalLinkProps = Omit<ReactComponentProps<typeof Link>, "href"> & {
  href: string | Exclude<ReactComponentProps<typeof Link>["href"], string>;
  onNavigate?: () => void;
};

export const InternalLink = ({
  onAuxClick,
  onClick,
  onNavigate,
  href,
  ...props
}: InternalLinkProps): React.JSX.Element => {
  const router = useRouter();
  const isElectron = isElectronRenderer();

  const navigate = (
    event: Readonly<{
      currentTarget: Readonly<Pick<HTMLAnchorElement, "getAttribute">>;
    }>
  ): void => {
    onNavigate?.();
    const targetHref = event.currentTarget.getAttribute("href");
    if (typeof targetHref === "string" && targetHref !== "") {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- #781: Next 16.3 typedRoutes requires Route assertions for nonliteral hrefs (next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md). This resolved anchor also supports Electron navigation; validating against generated route literals would reject supported dynamic/UrlObject links.
      router.push(targetHref as Route);
    }
  };

  const handleClick: ReactMouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || event.button !== PRIMARY_MOUSE_BUTTON) {
      return;
    }

    if (isElectron && (event.metaKey || event.ctrlKey || event.shiftKey)) {
      event.preventDefault();
      navigate(event);
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    onNavigate?.();
  };

  const handleAuxClick: ReactMouseEventHandler<HTMLAnchorElement> = (event) => {
    onAuxClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== AUXILIARY_MOUSE_BUTTON ||
      !isElectron
    ) {
      return;
    }

    event.preventDefault();
    navigate(event);
  };

  return (
    <Link
      {...props}

      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- #781: Next 16.3 typedRoutes requires Route assertions for nonliteral hrefs (next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md). This resolved anchor also supports Electron navigation; validating against generated route literals would reject supported dynamic/UrlObject links.
      href={href as Route}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
    />
  );
};
