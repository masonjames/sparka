/* eslint-disable @next/next/no-img-element */
"use client";

import type { ToolUIPart } from "ai";
import React from "react";
import type { BundledLanguage } from "shiki";
import {
  Sandbox,
  SandboxCode,
  SandboxContent,
  SandboxCopyButton,
  SandboxHeader,
  SandboxOutput,
  SandboxTabs,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@/components/ai-elements/sandbox";

type SandboxComposedProps = {
  code: string;
  output?: string;
  language?: BundledLanguage;
  title?: string;
  state: ToolUIPart["state"];
};

export function SandboxComposed({
  code,
  output,
  language = "tsx",
  title,
  state,
}: SandboxComposedProps) {
  const [activeTab, setActiveTab] = React.useState("code");

  const textToCopy = activeTab === "code" ? code : output || "";

  return (
    <Sandbox>
      <SandboxHeader state={state} title={title} />
      <SandboxContent>
        <SandboxTabs onValueChange={setActiveTab} value={activeTab}>
          <div className="flex items-center border-neutral-200 border-b dark:border-neutral-800">
            <SandboxTabsList>
              <SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
              {output && (
                <SandboxTabsTrigger value="output">Output</SandboxTabsTrigger>
              )}
            </SandboxTabsList>
            <SandboxCopyButton code={textToCopy} />
          </div>
          <SandboxCode code={code} language={language} />
          {output && <SandboxOutput output={output} />}
        </SandboxTabs>
      </SandboxContent>
    </Sandbox>
  );
}

// Export SandboxComposed as Sandbox for backward compatibility
export { SandboxComposed as Sandbox };
