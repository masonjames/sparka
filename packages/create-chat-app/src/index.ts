#!/usr/bin/env node
import { basename } from "node:path";
import { Command } from "commander";
import packageJson from "../package.json";
import { add } from "./commands/add";
import { create } from "./commands/create";
import { logger } from "./utils/logger";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const invokedAs = basename(process.argv[1] ?? "");
if (invokedAs === "create-chat-app") {
  logger.warn("`create-chat-app` is deprecated. Use `chatjs` instead.");
}

const program = new Command()
  .name("chatjs")
  .description("ChatJS CLI")
  .version(packageJson.version, "-v, --version", "display the version number");

program.addCommand(create, { isDefault: true });
program.addCommand(add);

program.parse();
