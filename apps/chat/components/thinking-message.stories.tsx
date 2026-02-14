import type { Meta, StoryObj } from "@storybook/react";
import { ThinkingMessage } from "./thinking-message";

const meta: Meta<typeof ThinkingMessage> = {
  title: "Components/AI/ThinkingMessage",
  component: ThinkingMessage,
};

export default meta;

type Story = StoryObj<typeof ThinkingMessage>;

export const Default: Story = {};
