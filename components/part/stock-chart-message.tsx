import { Check, Loader2, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import InteractiveStockChart, {
  type StockChartProps,
} from "../interactive-stock-chart";
import { Badge } from "../ui/badge";
import type { ChatMessage } from "@/lib/ai/types";

export type StockChartTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-stockChart" }
>;

export function StockChartMessage({ tool }: { tool: StockChartTool }) {
  const args =
    tool.input ?? ({ title: "", stock_symbols: [], interval: "1mo" } as const);
  const result = tool.state === "output-available" ? tool.output : null;

  const hasProp = <T extends string>(
    obj: unknown,
    prop: T
  ): obj is Record<T, unknown> => typeof obj === "object" && obj !== null && prop in obj;

  const isPoint = (p: unknown): p is [string, number] => {
    return (
      Array.isArray(p) &&
      p.length === 2 &&
      (typeof p[0] === "string" || typeof p[0] === "number") &&
      typeof p[1] === "number"
    );
  };

  const isElement = (
    e: unknown
  ): e is { label: string; points: [string, number][] } => {
    if (typeof e !== "object" || e === null) return false;
    const labelOk = hasProp(e, "label") && typeof e.label === "string";
    const pointsOk =
      hasProp(e, "points") &&
      Array.isArray(e.points) &&
      e.points.every((p) => isPoint(p));
    return labelOk && pointsOk;
  };

  let chartArg: StockChartProps["chart"] | null = null;
  if (result && typeof result.chart === "object" && result.chart !== null) {
    const c = result.chart;
    const type =
      hasProp(c, "type") && typeof c.type === "string" ? c.type : "line";
    const x_label =
      hasProp(c, "x_label") && typeof c.x_label === "string" ? c.x_label : "";
    const y_label =
      hasProp(c, "y_label") && typeof c.y_label === "string" ? c.y_label : "";
    const elements =
      hasProp(c, "elements") && Array.isArray(c.elements)
        ? c.elements.filter(isElement)
        : [];
    chartArg = {
      type,
      x_label,
      y_label,
      x_scale: "datetime",
      elements,
    };
  }
  const isValidInterval = (x: unknown): x is StockChartProps["interval"] => {
    return (
      typeof x === "string" &&
      [
        "1d",
        "5d",
        "1mo",
        "3mo",
        "6mo",
        "1y",
        "2y",
        "5y",
        "10y",
        "ytd",
        "max",
      ].includes(x)
    );
  };
  const interval: StockChartProps["interval"] = isValidInterval(args.interval)
    ? args.interval
    : "1mo";
  const stockSymbols: string[] = Array.isArray(args.stock_symbols)
    ? args.stock_symbols.reduce<string[]>((acc, s) => {
        if (typeof s === "string") {
          acc.push(s);
        }
        return acc;
      }, [])
    : [];
  return (
    <div className="mt-4 flex w-full flex-col gap-3">
      <Badge
        className={cn(
          "flex w-fit items-center gap-3 rounded-full px-4 py-2 transition-colors duration-200",
          result
            ? "bg-green-50/50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            : "bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        )}
        variant="secondary"
      >
        <TrendingUpIcon className="h-4 w-4" />
        <span className="font-medium">{args.title}</span>
        {result ? (
          <Check className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </Badge>

      {chartArg && (
        <div className="w-full">
          <InteractiveStockChart
            chart={chartArg}
            data={chartArg.elements}
            interval={interval}
            stock_symbols={stockSymbols}
            title={args.title || ""}
          />
        </div>
      )}
    </div>
  );
}


