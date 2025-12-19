"use client";

/**
 * Opens a popup window immediately (to avoid popup blockers).
 * Must be called synchronously from a user click handler.
 * Returns the window and a function to set the URL later.
 */
export function openOAuthPopup(): {
  window: Window;
  setUrl: (url: string) => void;
  close: () => void;
} | null {
  // Open with about:blank immediately to avoid popup blocker
  const authWindow = window.open(
    "about:blank",
    "mcp-oauth",
    "width=600,height=700,scrollbars=yes,resizable=yes,left=100,top=100"
  );

  if (!authWindow) {
    return null;
  }

  // Show loading state
  authWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Authorizing...</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 2rem; background: #0a0a0a; color: #fafafa;">
      <div style="max-width: 400px; margin: 0 auto; padding: 2rem;">
        <div style="margin-bottom: 1rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        <h2 style="margin: 0 0 0.5rem; font-size: 1.25rem;">Preparing authorization...</h2>
        <p style="margin: 0; color: #a1a1aa; font-size: 0.875rem;">Please wait</p>
      </div>
      <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
    </body>
    </html>
  `);

  return {
    window: authWindow,
    setUrl: (url: string) => {
      authWindow.location.href = url;
    },
    close: () => {
      try {
        authWindow.close();
      } catch {
        // Ignore
      }
    },
  };
}

/**
 * Client-side OAuth popup handler for MCP connectors.
 * Waits for the OAuth flow to complete in an already-opened popup.
 */
export function waitForOAuthComplete({
  authWindow,
  onSuccess,
  onError,
}: {
  authWindow: Window;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const cleanup = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener("message", messageHandler);
    };

    const handleSuccess = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      onSuccess?.();
      resolve(true);
    };

    const handleError = (error: Error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      onError?.(error);
      reject(error);
    };

    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, error, error_description } = event.data || {};

      if (type === "MCP_OAUTH_SUCCESS") {
        try {
          authWindow.close();
        } catch {
          // Ignore errors closing the window
        }
        handleSuccess();
      } else if (type === "MCP_OAUTH_ERROR") {
        try {
          authWindow.close();
        } catch {
          // Ignore errors closing the window
        }
        handleError(
          new Error(error_description || error || "OAuth authentication failed")
        );
      }
    };

    window.addEventListener("message", messageHandler);

    // Fallback: poll for window close
    intervalId = setInterval(() => {
      if (authWindow.closed) {
        if (!resolved) {
          setTimeout(() => {
            if (!resolved) {
              handleError(new Error("Authentication cancelled"));
            }
          }, 500);
        }
        cleanup();
      }
    }, 500);

    // Timeout after 5 minutes
    timeoutId = setTimeout(
      () => {
        if (!resolved) {
          try {
            authWindow.close();
          } catch {
            // Ignore
          }
          handleError(new Error("Authentication timed out"));
        }
      },
      5 * 60 * 1000
    );
  });
}
