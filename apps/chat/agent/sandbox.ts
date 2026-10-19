import { defineSandbox } from "eve/sandbox";
import { createPersistentSandboxEnvironment } from "../lib/eve/persistent-sandbox";

export const environment = createPersistentSandboxEnvironment();

export default defineSandbox(async () => await environment.open());
