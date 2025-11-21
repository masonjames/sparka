import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../components/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-links"],
  docs: {},
  typescript: {
    // Use project tsconfig for path aliases
    // reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
