import { config } from "dotenv";

config({
  path: ".env.local",
});


vi.mock("server-only", () => {
  return {
    // mock server-only module
  };
});