import type { Meta, StoryObj } from "@storybook/react";
import { Sandbox } from "./sandbox";

const meta: Meta<typeof Sandbox> = {
  title: "Components/AI/Sandbox",
  component: Sandbox,
};

export default meta;

type Story = StoryObj<typeof Sandbox>;

export const Default: Story = {
  args: {
    code: 'print("Hello, world!")',
    language: "python",
    state: "input-streaming",
    title: "Running Python code",
  },
};

export const CompletedWithOutput: Story = {
  args: {
    code: 'print("Computation complete")',
    language: "python",
    state: "output-available",
    title: "Computation",
    output: "Computation complete",
  },
};
