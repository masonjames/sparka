import {
  Edit3,
  GlobeIcon,
  Images,
  type LucideIcon,
  Telescope,
} from "lucide-react";
import type { UiToolName } from "@/lib/ai/types";

type ToolDefinition = {
  name: string;
  icon: LucideIcon;
  shortName: string;
};

export const toolDefinitions: Record<UiToolName, ToolDefinition> = {
  webSearch: { name: "Web Search", icon: GlobeIcon, shortName: "Search" },
  deepResearch: {
    name: "Deep Research",
    icon: Telescope,
    shortName: "Research",
  },
  generateImage: { name: "Create an image", icon: Images, shortName: "Image" },
  createTextDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
  createCodeDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
  createSheetDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
  editTextDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
  editCodeDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
  editSheetDocument: { name: "Canvas", icon: Edit3, shortName: "Canvas" },
};

export const enabledTools: UiToolName[] = [
  "webSearch",
  "deepResearch",
  "generateImage",
  "createTextDocument",
];
