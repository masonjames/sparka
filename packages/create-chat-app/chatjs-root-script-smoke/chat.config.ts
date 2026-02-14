import type { ConfigInput } from "@/lib/config-schema";

const config: ConfigInput = {
  appName: "My Chat App",
  appPrefix: "my-chat-app",
  appUrl: "http://localhost:3000",
  githubUrl: "https://github.com/your-org/your-repo",
  models: {
    gateway: "vercel",
  },
  features: {
    sandbox: false,
    webSearch: false,
    urlRetrieval: false,
    deepResearch: false,
    mcp: false,
    imageGeneration: false,
    attachments: false,
    followupSuggestions: true,
  },
  authentication: {
    google: false,
    github: true,
    vercel: false,
  },
};

export default config;
