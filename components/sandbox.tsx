/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import {
  Sandbox,
  SandboxHeader,
  SandboxContent,
  SandboxTabs,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxCopyButton,
  SandboxCode,
  SandboxOutput,
} from "@/components/ai-elements/sandbox";
import type { BundledLanguage } from "shiki";
import type { ToolUIPart } from "ai";

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
      <SandboxHeader title={title} state={state} />
      <SandboxContent>
        <SandboxTabs value={activeTab} onValueChange={setActiveTab}>
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
