import { defineSandbox } from "eve/sandbox";
import { config } from "../lib/config";
import { createPersistentSandboxEnvironment } from "../lib/eve/persistent-sandbox";

export const environment = createPersistentSandboxEnvironment(
  config.persistentSandbox
);

export default defineSandbox(async () => await environment.open());
