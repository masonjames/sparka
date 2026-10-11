"use client";

import type { BundledLanguage, ShikiTransformer } from "shiki";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, JSX as ReactJSX } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { codeToHtml } from "shiki";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

interface CodeBlockContextType {
  code: string;
}

const COPY_BUTTON_TIMEOUT_MS = 2000;
const COPY_BUTTON_ICON_SIZE = 14;

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const lineNumberTransformer: ShikiTransformer = {
  line(node, line) {
    node.children.unshift({
      children: [{ type: "text", value: String(line) }],
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      tagName: "span",
      type: "element",
    });
  },
  name: "line-numbers",
};

const highlightCode = async (
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
): Promise<[string, string]> => {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "one-dark-pro",
      transformers,
    }),
  ]);
};

const useHighlightedCode = (
  code: string,
  language: BundledLanguage,
  showLineNumbers: boolean
): { readonly html: string; readonly darkHtml: string } => {
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const updateHighlightedCode = async (): Promise<void> => {
      const [light, dark] = await highlightCode(
        code,
        language,
        showLineNumbers
      );
      if (!cancelled) {
        setHtml(light);
        setDarkHtml(dark);
      }
    };
    void updateHighlightedCode();

    return (): void => {
      cancelled = true;
    };
  }, [code, language, showLineNumbers]);

  return { darkHtml, html };
};

/* oxlint-disable typescript/strict-boolean-expressions -- CodeBlock: react/jsx-max-depth: the existing accessible component hierarchy preserves layout, provider, and interaction boundaries; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including children). */

const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps): ReactJSX.Element => {
  const { html, darkHtml } = useHighlightedCode(
    code,
    language,
    showLineNumbers
  );

  const contextValue = useMemo(() => ({ code }), [code]);

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <div
        className={cn(
          "group bg-background text-foreground relative w-full overflow-hidden rounded-md border",
          className
        )}
        {...props}
      >
        <div className="relative">
          {/* Shiki returns escaped, trusted HTML for syntax highlighting. */}
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! overflow-auto dark:hidden [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            // oxlint-disable-next-line react/no-danger -- codeToHtml escapes source; line labels are numeric text in static spans.
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {/* Shiki returns escaped, trusted HTML for syntax highlighting. */}
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! hidden overflow-auto dark:block [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            // oxlint-disable-next-line react/no-danger -- codeToHtml escapes source; line labels are numeric text in static spans.
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */

type CodeBlockCopyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onCopy" | "onError"
> & {
  readonly onCopy?: () => void | Promise<void>;
  readonly onError?: (error: Readonly<Error>) => void | Promise<void>;
  timeout?: number;
};

const useCopyCode = (
  code: string,
  {
    timeout,
    onCopy,
    onError,
  }: Readonly<
    Pick<CodeBlockCopyButtonProps, "onCopy" | "onError"> & { timeout: number }
  >
): { readonly isCopied: boolean; readonly handleClick: () => void } => {
  const [isCopied, setIsCopied] = useState(false);
  const [, startCopyTransition] = useTransition();

  const copyToClipboard = useCallback(async (): Promise<void> => {
    if (
      typeof window === "undefined" ||
      typeof navigator?.clipboard?.writeText !== "function"
    ) {
      await (typeof onError === "function" &&
        onError(new Error("Clipboard API not available")));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, timeout);
      await (typeof onCopy === "function" && onCopy());
    } catch (error) {
      await (typeof onError === "function" &&
        onError(error instanceof Error ? error : new Error(String(error))));
    }
  }, [code, onCopy, onError, timeout]);

  const handleClick = useCallback((): void => {
    startCopyTransition(copyToClipboard);
  }, [copyToClipboard, startCopyTransition]);
  return { handleClick, isCopied };
};

const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = COPY_BUTTON_TIMEOUT_MS,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps): ReactJSX.Element => {
  const { code } = useContext(CodeBlockContext);
  const { isCopied, handleClick } = useCopyCode(code, {
    onCopy,
    onError,
    timeout,
  });
  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={handleClick}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={COPY_BUTTON_ICON_SIZE} />}
    </Button>
  );
};
export { CodeBlock, CodeBlockCopyButton, highlightCode };
export type { CodeBlockCopyButtonProps };
