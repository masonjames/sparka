import { defineHook } from "eve/hooks";
import { config } from "../../../lib/config";
import { registerAppSandboxSession } from "../../../lib/eve/persistent-sandbox";

export default defineHook({
  events: {
    "session.started": async (_event, context) => {
      if (config.persistentSandbox === "app") {
        await registerAppSandboxSession(context);
      }
    },
  },
});
