import type { ChatMessage } from "@/lib/ai/types";
import InteractiveChart, { type BaseChart } from "../interactive-charts";
import { Sandbox } from "../sandbox";

export type CodeInterpreterTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-codeInterpreter" }
>;

function isBaseChart(input: unknown): input is BaseChart {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const maybe = input as Record<string, unknown>;
  const hasType = typeof maybe.type === "string";
  const hasTitle =
    typeof maybe.title === "string" || typeof maybe.title === "undefined";
  const hasElements = Array.isArray(maybe.elements);
  return hasType && hasTitle && hasElements;
}

export function CodeInterpreterMessage({
  tool,
}: {
  tool: CodeInterpreterTool;
}) {
  const args = tool.input ?? { code: "", title: "", icon: "default" };
  const result = tool.state === "output-available" ? tool.output : null;
  const chart: BaseChart | null =
    result && isBaseChart(result.chart) ? result.chart : null;
  const code = typeof args.code === "string" ? args.code : "";
  const title = typeof args.title === "string" ? args.title : "";
  return (
    <div className="space-y-6">
      <Sandbox
        code={code}
        language="python"
        output={result?.message}
        state={tool.state}
        title={title}
      />

      {chart && (
        <div className="pt-1">
          <InteractiveChart chart={chart} />
        </div>
      )}
    </div>
  );
}
