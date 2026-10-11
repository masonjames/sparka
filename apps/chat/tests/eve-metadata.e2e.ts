import { mkdir } from "node:fs/promises";

/* oxlint-disable eslint/no-await-in-loop -- Integration steps and transaction fixtures intentionally run in order. */
import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "../lib/db/client";
import { eveChat, eveConversation, user } from "../lib/db/schema";
import { insertEveConversationFixtures } from "./eve-conversation-fixture";
import { assertEveTestDatabase } from "./eve-test-database";

const metadataTitle = /renamed|metadata newer/u;

assertEveTestDatabase(process.env.DATABASE_URL ?? "http://invalid");

/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions --
 * typescript/promise-function-async (#606): test("rename and pin persist, preserve input, and reject another owner's changes") preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 * typescript/strict-boolean-expressions (#610): test("rename and pin persist, preserve input, and reject another owner's changes") intentionally keeps the existing falsy-value behavior of owner; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
test("rename and pin persist, preserve input, and reject another owner's changes", async ({
  page,
  browser,
}) => {
  await page.route("https://unpkg.com/react-scan/**", (route) => route.abort());
  await page.goto("/api/dev-login");
  const [owner] = await db
    .select()
    .from(user)
    .where(eq(user.email, "dev@localhost"));
  if (!owner) {
    throw new Error("Missing development user");
  }
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const foreignOwner = crypto.randomUUID();
  const firstTitle = `metadata older ${ids[0]}`;
  const secondTitle = `metadata newer ${ids[1]}`;
  const renamed = `renamed ${ids[0]}`;
  await db.insert(user).values({
    email: `${foreignOwner}@test.invalid`,
    id: foreignOwner,
    name: "Metadata test",
  });
  await insertEveConversationFixtures(
    ids.map((id, index) => ({
      firstMessage: index === 0 ? firstTitle : secondTitle,
      id,
      operationId: crypto.randomUUID(),
      ownerId: index === 2 ? foreignOwner : owner.id,
      updatedAt: new Date(Date.now() + index * 1000),
    }))
  );
  try {
    await page.goto("/");
    const expand = page.getByRole("button", {
      exact: true,
      name: "Expand sidebar",
    });
    if (await expand.isVisible()) {
      await expand.click();
    }
    const row = () =>
      page.getByRole("link", { exact: true, name: firstTitle }).locator("..");
    await row().getByRole("button", { exact: true, name: "More" }).click();
    await page.getByRole("menuitem", { exact: true, name: "Rename" }).click();
    await page
      .locator(
        'input[maxlength="255"]:not([aria-label="Search conversations"]):visible'
      )
      .fill(renamed);
    const renameResponse = page.waitForResponse(
      "**/api/trpc/eve.rename?batch=1"
    );
    await page
      .locator(
        'input[maxlength="255"]:not([aria-label="Search conversations"]):visible'
      )
      .press("Enter");
    const renamedResponse = await renameResponse;
    expect(renamedResponse.ok(), await renamedResponse.text()).toBe(true);
    await expect(
      page.getByRole("link", { exact: true, name: renamed })
    ).toBeVisible();
    const renamedRow = page
      .getByRole("link", { exact: true, name: renamed })
      .locator("..");
    await renamedRow.getByRole("button", { exact: true, name: "More" }).click();
    await page.getByRole("menuitem", { exact: true, name: "Pin" }).click();
    await expect
      .poll(async () => {
        const conversationRows = await db
          .select({ isPinned: eveChat.isPinned })
          .from(eveConversation)
          .innerJoin(eveChat, eq(eveChat.id, eveConversation.chatId))
          .where(eq(eveConversation.id, ids[0]));
        return conversationRows?.[0]?.isPinned;
      })
      .toBe(true);
    await page.reload();
    await expect(
      page.getByRole("link", { exact: true, name: renamed })
    ).toBeVisible();
    const conversationLinks = page
      .locator('a[href^="/chat/"]')
      .filter({ hasText: metadataTitle });
    await expect(conversationLinks.first()).toHaveText(renamed);
    await renamedRow.getByRole("button", { exact: true, name: "More" }).click();
    await expect(
      page.getByRole("menuitem", { exact: true, name: "Unpin" })
    ).toBeVisible();
    await mkdir("tests/eve-results/screenshots", { recursive: true });
    await page.screenshot({
      animations: "disabled",
      path: "tests/eve-results/screenshots/eve-history-menu.png",
      style:
        "nextjs-portal, #react-scan-toolbar, #react-scan-root { visibility:hidden !important; }",
    });
    await page.getByRole("menuitem", { exact: true, name: "Unpin" }).click();
    await expect
      .poll(async () => {
        const conversationRows = await db
          .select({ isPinned: eveChat.isPinned })
          .from(eveConversation)
          .innerJoin(eveChat, eq(eveChat.id, eveConversation.chatId))
          .where(eq(eveConversation.id, ids[0]));
        return conversationRows?.[0]?.isPinned;
      })
      .toBe(false);
    await page.reload();
    await expect(conversationLinks.first()).toHaveText(secondTitle);
    for (const { procedure, input } of [
      { input: { id: ids[2], title: "intrusion" }, procedure: "rename" },
      { input: { id: ids[2], isPinned: true }, procedure: "pin" },
    ]) {
      const response = await page.request.post(`/api/trpc/eve.${procedure}`, {
        data: { json: input },
      });
      expect(response.status()).toBe(404);
    }
    const invalid = await page.request.post("/api/trpc/eve.rename", {
      data: { json: { id: ids[0], title: "  " } },
    });
    expect(invalid.status()).toBe(400);
    const anonymous = await browser.newContext();
    try {
      const rejected = await anonymous.request.post(
        new URL("/api/trpc/eve.rename", page.url()).href,
        { data: { json: { id: ids[0], title: "intrusion" } } }
      );
      expect(rejected.status()).toBe(401);
    } finally {
      await anonymous.close();
    }
    const [stored] = await db
      .select({
        firstMessage: eveConversation.firstMessage,
        isPinned: eveChat.isPinned,
        title: eveChat.title,
      })
      .from(eveConversation)
      .innerJoin(eveChat, eq(eveChat.id, eveConversation.chatId))
      .where(eq(eveConversation.id, ids[0]));
    expect(stored?.title).toBe(renamed);
    expect(stored?.firstMessage).toBe(firstTitle);
    const [foreign] = await db
      .select({
        firstMessage: eveConversation.firstMessage,
        isPinned: eveChat.isPinned,
        title: eveChat.title,
      })
      .from(eveConversation)
      .innerJoin(eveChat, eq(eveChat.id, eveConversation.chatId))
      .where(eq(eveConversation.id, ids[2]));
    expect(foreign?.title).toBe(secondTitle);
    expect(foreign?.isPinned).toBe(false);
  } finally {
    await db.delete(eveConversation).where(inArray(eveConversation.id, ids));
    await db.delete(user).where(eq(user.id, foreignOwner));
  }
});
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */
