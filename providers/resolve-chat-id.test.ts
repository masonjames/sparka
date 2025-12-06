import { describe, expect, it } from "vitest";
import { resolveChatId } from "./resolve-chat-id";

const PROVISIONAL_ID = "provisional-uuid-123";

describe("resolveChatId", () => {
  describe("shared routes (/share/:id)", () => {
    it("returns shared type for /share/:id", () => {
      expect(
        resolveChatId({
          pathname: "/share/abc-123",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: "abc-123", type: "shared" });
    });

    it("handles share with complex id", () => {
      expect(
        resolveChatId({
          pathname: "/share/abc-123-def-456",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: "abc-123-def-456", type: "shared" });
    });
  });

  describe("project routes (/project/:projectId...)", () => {
    it("returns provisional for /project/:projectId (no chat)", () => {
      expect(
        resolveChatId({
          pathname: "/project/proj-123",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: PROVISIONAL_ID, type: "provisional" });
    });

    it("returns chat type for /project/:projectId/chat/:chatId", () => {
      expect(
        resolveChatId({
          pathname: "/project/proj-123/chat/chat-456",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: "chat-456", type: "chat" });
    });
  });

  describe("chat routes (/chat/:id)", () => {
    it("returns chat type for /chat/:id", () => {
      expect(
        resolveChatId({
          pathname: "/chat/chat-789",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: "chat-789", type: "chat" });
    });

    it("returns provisional when chat id matches provisional id", () => {
      expect(
        resolveChatId({
          pathname: `/chat/${PROVISIONAL_ID}`,
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: PROVISIONAL_ID, type: "provisional" });
    });
  });

  describe("root and fallback", () => {
    it("returns provisional for /", () => {
      expect(
        resolveChatId({ pathname: "/", provisionalId: PROVISIONAL_ID })
      ).toEqual({ id: PROVISIONAL_ID, type: "provisional" });
    });

    it("returns provisional for null pathname", () => {
      expect(
        resolveChatId({ pathname: null, provisionalId: PROVISIONAL_ID })
      ).toEqual({ id: PROVISIONAL_ID, type: "provisional" });
    });

    it("returns provisional for unknown routes", () => {
      expect(
        resolveChatId({
          pathname: "/settings",
          provisionalId: PROVISIONAL_ID,
        })
      ).toEqual({ id: PROVISIONAL_ID, type: "provisional" });
    });
  });
});
