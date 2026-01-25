import {
  Edit3,
  GlobeIcon,
  Images,
  type LucideIcon,
  Telescope,
} from "lucide-react";
import type { ToolName, UiToolName } from "@/lib/ai/types";

type ToolDefinition = {
  name: string;
  description: string;
  icon: LucideIcon;
  key: ToolName;
  shortName: string;
};

export const toolDefinitions: Record<UiToolName, ToolDefinition> = {
  webSearch: {
    key: "webSearch",
    name: "Web Search",
    description: "Search the web for real-time information.",
    icon: GlobeIcon,
    shortName: "Search",
  },
  deepResearch: {
    key: "deepResearch",
    name: "Deep Research",
    description: "Get comprehensive analysis with citations.",
    icon: Telescope,
    shortName: "Research",
  },
  generateImage: {
    key: "generateImage",
    name: "Create an image",
    description: "Generate images from text descriptions.",
    icon: Images,
    shortName: "Image",
  },
  createTextDocument: {
    key: "createTextDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
  createCodeDocument: {
    key: "createCodeDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
  createSheetDocument: {
    key: "createSheetDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
  editTextDocument: {
    key: "editTextDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
  editCodeDocument: {
    key: "editCodeDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
  editSheetDocument: {
    key: "editSheetDocument",
    name: "Canvas",
    description: "Create documents, code, or run code in a sandbox.",
    icon: Edit3,
    shortName: "Canvas",
  },
};

export const enabledTools: UiToolName[] = [
  "webSearch",
  "deepResearch",
  "generateImage",
  "createTextDocument",
];
