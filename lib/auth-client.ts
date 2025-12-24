import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
  plugins: [nextCookies()],
});

export default authClient;
