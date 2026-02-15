import { Command } from "commander";
import { handleError } from "../utils/handle-error";
import { logger } from "../utils/logger";

export const add = new Command()
  .name("add")
  .description("add a component or feature to an existing ChatJS project")
  .argument("[components...]", "component names to add")
  .option("-y, --yes", "skip confirmation prompt", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory (defaults to current directory)",
    process.cwd()
  )
  .action(async (_components, _opts) => {
    try {
      logger.warn(
        "The add command is not yet implemented."
      );
      logger.info(
        "Coming soon: add features, auth providers, and gateways to existing projects."
      );
    } catch (error) {
      handleError(error);
    }
  });
