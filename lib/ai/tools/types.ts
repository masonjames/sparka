// Minimal session type for tools - only requires user.id for document persistence
export type ToolSession = {
  user?: {
    id?: string;
  };
};
