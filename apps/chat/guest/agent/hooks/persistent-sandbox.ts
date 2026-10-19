import { defineHook } from "eve/hooks";
import { registerAppSandboxSession } from "../../../lib/eve/persistent-sandbox";

export default defineHook({
  events: {
    "session.started": async (_event, context) => {
      await registerAppSandboxSession(context);
    },
  },
});
