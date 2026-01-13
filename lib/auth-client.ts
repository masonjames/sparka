import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

function getBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [nextCookies()],
});

export default authClient;
