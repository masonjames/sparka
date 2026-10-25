import type { ChatPlugin } from "@/lib/plugin-contracts";
import { creditsRouter } from "./router";

export const credits = () =>
  ({ id: "credits", routers: { credits: creditsRouter } }) satisfies ChatPlugin;
