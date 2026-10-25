import type { ChatClientPlugin } from "@/lib/plugin-contracts";
import { CreditBalance } from "./balance";

export const creditsClient = () =>
  ({ id: "credits", accountSummary: CreditBalance }) satisfies ChatClientPlugin;
