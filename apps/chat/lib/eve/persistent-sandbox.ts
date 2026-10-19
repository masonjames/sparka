import { DefaultSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";
import type { SandboxEnvironment } from "eve/sandbox";

/** Choose the persistent session filesystem independently of transient code execution.
 * Set persistentSandboxProvider in chat.config.ts to opt into Vercel for an
 * isolated app/world with new sessions. Changing this value does not migrate
 * existing provider bindings. Leave it on auto for existing installations.
 * Vercel needs sandbox credentials and prepares a reusable template snapshot.
 * ChatJS deletion is fenced for this profile until provider-aware cleanup exists;
 * development shutdown cleanup is also not guaranteed. This is not a default
 * provider migration or removal of the Microsandbox fork support.
 * @param {"auto" | "vercel"} provider Application-selected persistent provider.
 * @returns {SandboxEnvironment} Public EVE environment; construction does not open a session.
 */
export const createPersistentSandboxEnvironment = (
  provider: "auto" | "vercel"
): SandboxEnvironment =>
  provider === "vercel"
    ? VercelSandbox.environment()
    : DefaultSandbox.environment();
