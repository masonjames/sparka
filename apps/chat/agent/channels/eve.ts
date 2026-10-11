import { eveChannel } from "eve/channels/eve";

import { fetchEveChannelFile } from "../../lib/eve/channel-files";
import { ownsEveSession } from "../../lib/db/eve-queries";
import { resolveAcceptedEveCopySeed } from "../../lib/db/eve-copy-dispatch";
import { authenticateEveGateway } from "../../lib/eve/gateway-auth";

/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): default export preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
export default eveChannel({
  auth: authenticateEveGateway,
  authorizeFork: ({ auth, sourceSessionId }): Promise<boolean> =>
    ownsEveSession(auth.principalId, sourceSessionId),
  fetchFile: fetchEveChannelFile,
  resolveSeed: ({ auth, operationId }) =>
    resolveAcceptedEveCopySeed(auth.principalId, operationId),
});
/* oxlint-enable typescript/promise-function-async */
