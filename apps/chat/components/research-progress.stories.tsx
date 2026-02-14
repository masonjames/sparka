import type { Meta, StoryObj } from "@storybook/react";
import type { ResearchUpdate } from "@/lib/ai/tools/research-updates-schema";
import { ResearchProgress } from "./research-progress";

const meta: Meta<typeof ResearchProgress> = {
  title: "Components/AI/ResearchProgress",
  component: ResearchProgress,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="bg-background p-6">
        <div className="mx-auto max-w-3xl">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;

type ResearchProgressStory = StoryObj<typeof ResearchProgress>;

const now = Date.now();
const startedAt = now - 45_000;
const completedAt = now - 5000;

const runningUpdates: ResearchUpdate[] = [
  {
    type: "started",
    toolCallId: "mock-tool-call-id",
    title: "Started deep research",
    timestamp: startedAt,
  },
  {
    type: "web",
    toolCallId: "mock-tool-call-id",
    status: "running",
    title: "Searching for recent performance benchmarks",
    queries: ["bun vs node benchmarks 2024", "drizzle orm performance"],
    results: [
      {
        url: "https://example.com/benchmarks",
        title: "Comprehensive JS Runtimes Benchmarks",
        content: "Bun shows strong startup and HTTP performance...",
        source: "web",
      },
      {
        url: "https://example.com/drizzle",
        title: "Drizzle ORM analysis",
        content: "Type-safe queries with good migration ergonomics...",
        source: "web",
      },
    ],
  },
  {
    type: "thoughts",
    toolCallId: "mock-tool-call-id",
    status: "running",
    title: "Analyzing trade-offs",
    message:
      "Bun improves cold-start latency; Drizzle provides schema-first safety with minimal overhead.",
  },
  {
    type: "writing",
    toolCallId: "mock-tool-call-id",
    status: "running",
    title: "Drafting findings",
    message: "Summarizing key results and references...",
  },
];

const completedUpdates: ResearchUpdate[] = [
  {
    type: "started",
    toolCallId: "mock-tool-call-id",
    title: "Started deep research",
    timestamp: startedAt,
  },
  {
    type: "web",
    toolCallId: "mock-tool-call-id",
    status: "completed",
    title: "Collected benchmark sources",
    queries: ["bun vs node benchmarks 2024"],
    results: [
      {
        url: "https://example.com/benchmarks",
        title: "Comprehensive JS Runtimes Benchmarks",
        content: "Bun shows strong startup and HTTP performance...",
        source: "web",
      },
    ],
  },
  {
    type: "thoughts",
    toolCallId: "mock-tool-call-id",
    status: "completed",
    title: "Synthesized insights",
    message: "Bun excels at startup; Node still wins in ecosystem maturity.",
  },
  {
    type: "writing",
    toolCallId: "mock-tool-call-id",
    status: "completed",
    title: "Wrote final summary",
    message: "Providing actionable guidance and references.",
  },
  {
    type: "completed",
    toolCallId: "mock-tool-call-id",
    title: "Research complete",
    timestamp: completedAt,
  },
];

const manyWebUpdates: ResearchUpdate[] = [
  {
    type: "started",
    toolCallId: "mock-tool-call-id",
    title: "Initiated research sprint",
    timestamp: startedAt,
  },
  ...Array.from({ length: 5 }).flatMap((_, i) => {
    const idx = i + 1;
    return [
      {
        type: "web",
        toolCallId: "mock-tool-call-id",
        status: "running",
        title: `Search round ${idx}: collecting sources`,
        queries: [`query ${idx}a`, `query ${idx}b`],
        results: [
          {
            url: `https://example.com/source-${idx}-a`,
            title: `Result ${idx}A`,
            content: "Snippet content A",
            source: "web",
          },
          {
            url: `https://example.com/source-${idx}-b`,
            title: `Result ${idx}B`,
            content: "Snippet content B",
            source: "web",
          },
        ],
      } as ResearchUpdate,
    ];
  }),
  {
    type: "writing",
    toolCallId: "mock-tool-call-id",
    status: "running",
    title: "Aggregating and drafting",
    message: "Organizing citations and summarizing recurring themes.",
  },
];

export const Running: ResearchProgressStory = {
  args: {
    updates: runningUpdates,
    totalExpectedSteps: 6,
    isComplete: false,
  },
};

export const Completed: ResearchProgressStory = {
  args: {
    updates: completedUpdates,
    totalExpectedSteps: 6,
    isComplete: true,
  },
};

export const ManyWebSearches: ResearchProgressStory = {
  args: {
    updates: manyWebUpdates,
    totalExpectedSteps: 12,
    isComplete: false,
  },
};

export const Empty: ResearchProgressStory = {
  args: {
    updates: [],
    totalExpectedSteps: 0,
    isComplete: false,
  },
};
