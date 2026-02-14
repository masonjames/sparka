#!/usr/bin/env bun
import { Command } from "commander";
import packageJson from "../package.json";
import { add } from "./commands/add";
import { create } from "./commands/create";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const program = new Command()
  .name("create-chat-app")
  .description("Create a new ChatJS chat application")
  .version(packageJson.version, "-v, --version", "display the version number");

program.addCommand(create, { isDefault: true });
program.addCommand(add);

program.parse();
