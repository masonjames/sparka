import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { intro, outro } from "@clack/prompts";
import { Command } from "commander";
import { z } from "zod";
import { collectEnvChecklist } from "../helpers/env-checklist";
import { buildConfigTs } from "../helpers/config-builder";
import { ensureTargetEmpty } from "../helpers/ensure-target";
import {
  promptAppDetails,
  promptAuth,
  promptFeatures,
  promptGateway,
  promptInstall,
  promptProjectName,
} from "../helpers/prompts";
import { scaffoldFromGit, scaffoldFromTemplate } from "../helpers/scaffold";
import { inferPackageManager } from "../utils/get-package-manager";
import { handleError } from "../utils/handle-error";
import { highlighter } from "../utils/highlighter";
import { logger } from "../utils/logger";
import { runCommand } from "../utils/run-command";
import { spinner } from "../utils/spinner";

const createOptionsSchema = z.object({
  target: z.string().optional(),
  yes: z.boolean(),
  install: z.boolean(),
  fromGit: z.string().optional(),
});

export const create = new Command()
  .name("create")
  .description("scaffold a new ChatJS chat application")
  .argument("[directory]", "target directory for the project")
  .option("-y, --yes", "skip prompts and use defaults", false)
  .option("--no-install", "skip dependency installation")
  .option(
    "--from-git <url>",
    "clone from a git repository instead of the built-in scaffold"
  )
  .action(async (directory, opts) => {
    try {
      const options = createOptionsSchema.parse({
        target: directory,
        ...opts,
      });

      const packageManager = inferPackageManager();

      if (!options.yes) {
        intro("Create ChatJS App");
      }

      // 1. Project name
      const projectName = await promptProjectName(
        options.target,
        options.yes
      );
      const targetDir = resolve(process.cwd(), projectName);

      // 2. App details
      const { appName, appPrefix, appUrl, githubUrl } =
        await promptAppDetails(options.yes);

      // 3. Gateway selection
      const gateway = await promptGateway(options.yes);

      // 4. Features
      const features = await promptFeatures(options.yes);

      // 5. Auth providers
      const auth = await promptAuth(options.yes);

      // 6. Validate target
      await ensureTargetEmpty(targetDir);

      // 7. Scaffold project
      logger.break();
      const scaffoldSpinner = spinner("Scaffolding project...").start();
      try {
        if (options.fromGit) {
          await scaffoldFromGit(options.fromGit, targetDir);
        } else {
          await scaffoldFromTemplate(targetDir);
        }
        scaffoldSpinner.succeed("Project scaffolded.");
      } catch (error) {
        scaffoldSpinner.fail("Failed to scaffold project.");
        throw error;
      }

      // 8. Write configuration
      const configSpinner = spinner("Writing configuration...").start();
      try {
        const packageJsonPath = join(targetDir, "package.json");
        const packageJson = JSON.parse(
          await readFile(packageJsonPath, "utf8")
        ) as { name?: string };
        packageJson.name = projectName;
        await writeFile(
          packageJsonPath,
          `${JSON.stringify(packageJson, null, 2)}\n`
        );

        const configSource = buildConfigTs({
          appName,
          appPrefix,
          appUrl,
          githubUrl,
          gateway,
          features,
          auth,
        });
        await writeFile(join(targetDir, "chat.config.ts"), configSource);
        configSpinner.succeed("Configuration written.");
      } catch (error) {
        configSpinner.fail("Failed to write configuration.");
        throw error;
      }

      // 9. Install dependencies
      const installNow = !options.install
        ? false
        : await promptInstall(packageManager, options.yes);
      if (installNow) {
        const installSpinner = spinner(
          `Installing dependencies with ${highlighter.info(packageManager)}...`
        ).start();
        try {
          await runCommand(packageManager, ["install"], targetDir);
          installSpinner.succeed("Dependencies installed.");
        } catch (error) {
          installSpinner.fail("Failed to install dependencies.");
          throw error;
        }
      }

      // 10. Success output
      const envChecklist = collectEnvChecklist({ gateway, features, auth });

      outro("Your ChatJS app is ready!");

      logger.info("Next steps:");
      logger.log(`  cd ${highlighter.info(projectName)}`);
      logger.log(`  ${highlighter.info(`${packageManager} run dev`)}`);
      logger.break();
      if (envChecklist.length > 0) {
        logger.info("Required environment variables:");
        for (const item of envChecklist) {
          logger.log(`  ${highlighter.warn("*")} ${item}`);
        }
        logger.break();
      }
    } catch (error) {
      handleError(error);
    }
  });
