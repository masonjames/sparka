import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/* oxlint-disable promise/avoid-new -- These fixtures adapt callback, or browser event APIs into awaited Promises. */
/* oxlint-disable eslint/no-await-in-loop -- Integration steps and transaction fixtures intentionally run in order. */
import { expect, test } from "@playwright/test";
import type { Request, TestInfo } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../lib/db/client";
import { eveConversation, eveVote } from "../lib/db/schema";
import { assertEveTestDatabase } from "./eve-test-database";

assertEveTestDatabase(process.env.DATABASE_URL ?? "http://invalid");

const votesRoute = (url: Readonly<Pick<URL, "pathname">>): boolean =>
  url.pathname.includes("eve.votes");
const mutationRoute = (url: Readonly<Pick<URL, "pathname">>): boolean =>
  url.pathname.includes("eve.vote") && !url.pathname.includes("eve.votes");

/* oxlint-disable typescript/promise-function-async, typescript/strict-void-return --
 * typescript/promise-function-async (#606): test("assistant feedback survives reload, recovers from errors and stays out of publi preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 * typescript/strict-void-return (#611): test("assistant feedback survives reload, recovers from errors and stays out of publi's void callback contract discards its result; changing the callback API or operation order solely to hide the return value is unnecessary.
 */
test("assistant feedback survives reload, recovers from errors and stays out of public shares", async ({
  page,
  browser,
}, testInfo: Readonly<Pick<TestInfo, "outputPath">>) => {
  await page.route("https://unpkg.com/react-scan/**", (route) => route.abort());
  await page.goto("/api/dev-login");
  const created = await page.request.post("/api/agent-conversations", {
    data: {
      message: "Reply exactly feedback-fixture-ok",
      modelId: "openai/gpt-5-mini",
      operationId: crypto.randomUUID(),
    },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const binding = z.object({ id: z.uuid() }).parse(await created.json());
  const anonymous = await browser.newContext();
  try {
    await page.goto(`/chat/${binding.id}`);
    await expect(page.locator(".is-assistant")).toContainText(
      "feedback-fixture-ok",
      { timeout: 90_000 }
    );
    const up = page.getByTestId("message-upvote");
    const down = page.getByTestId("message-downvote");
    await expect(up).toBeEnabled();
    await expect(
      page.locator(".is-user").getByTestId("message-upvote")
    ).toHaveCount(0);
    await up.click();
    await expect(up).toHaveAttribute("aria-pressed", "true");
    await expect(up).toBeDisabled();
    await expect(down).toBeEnabled();
    await page.reload();
    await expect(up).toHaveAttribute("aria-pressed", "true");
    for (const width of [1100, 390]) {
      await page.setViewportSize({ height: 850, width });
      await page.locator(".is-assistant").screenshot({
        animations: "disabled",
        path: testInfo.outputPath(`feedback-${width}.png`),
      });
    }
    await page.route(
      (url: Readonly<Pick<URL, "pathname">>) =>
        url.pathname.includes("eve.vote") &&
        !url.pathname.includes("eve.votes"),
      (route) =>
        route.fulfill({
          body: "{}",
          contentType: "application/json",
          status: 500,
        }),
      { times: 1 }
    );
    await down.click();
    await expect(page.getByText("Failed to downvote response.")).toBeVisible();
    await expect(down).toBeEnabled();
    await expect(up).toHaveAttribute("aria-pressed", "true");
    await down.click();
    await expect(down).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(down).toHaveAttribute("aria-pressed", "true");

    await page.route(votesRoute, (route) =>
      route.fulfill({
        body: "{}",
        contentType: "application/json",
        status: 500,
      })
    );
    await page.reload();
    const retry = page.getByRole("button", { name: "Retry loading feedback" });
    await expect(retry).toBeVisible();
    await page.locator(".is-assistant").screenshot({
      animations: "disabled",
      path: testInfo.outputPath("feedback-load-error.png"),
    });
    await page.unroute(votesRoute);
    await retry.click();
    await expect(down).toHaveAttribute("aria-pressed", "true");

    // A focus refetch starts during a save and returns the previous vote last.
    const mutationStarted = Promise.withResolvers<undefined>();
    const resumeMutation = Promise.withResolvers<undefined>();
    const staleReadStarted = Promise.withResolvers<undefined>();
    const releaseStaleRead = Promise.withResolvers<undefined>();
    const staleReadFinished = Promise.withResolvers<undefined>();
    await page.route(
      mutationRoute,
      async (route) => {
        // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
        mutationStarted.resolve(undefined);
        await resumeMutation.promise;
        await route.continue();
      },
      { times: 1 }
    );
    await page.route(
      votesRoute,
      async (route) => {
        const response = await route.fetch();
        // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
        staleReadStarted.resolve(undefined);
        await releaseStaleRead.promise;
        try {
          await route.fulfill({ response });
        } finally {
          // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
          staleReadFinished.resolve(undefined);
        }
      },
      { times: 1 }
    );
    try {
      await up.click();
      await mutationStarted.promise;
      await page.clock.setFixedTime(new Date(Date.now() + 120_000));
      await page.evaluate(() =>
        globalThis.dispatchEvent(new Event("visibilitychange"))
      );
      await staleReadStarted.promise;
      // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
      resumeMutation.resolve(undefined);
      await expect(up).toHaveAttribute("aria-pressed", "true");
      // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
      releaseStaleRead.resolve(undefined);
      await staleReadFinished.promise;
      // A following browser task runs after the completed response is processed.
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          })
      );
      await expect(up).toHaveAttribute("aria-pressed", "true");
      await expect(down).toBeEnabled();
    } finally {
      // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
      resumeMutation.resolve(undefined);
      // oxlint-disable-next-line unicorn/no-useless-undefined -- The Promise<undefined> resolver requires its explicit completion value.
      releaseStaleRead.resolve(undefined);
    }

    const shared = await page.request.post("/api/trpc/eve.setVisibility", {
      data: { json: { id: binding.id, visibility: "public" } },
    });
    expect(shared.ok(), await shared.text()).toBe(true);
    const publicPage = await anonymous.newPage();
    const feedbackRequests: string[] = [];
    publicPage.on("request", (request: Readonly<Pick<Request, "url">>) => {
      if (request.url().includes("eve.vote")) {
        feedbackRequests.push(request.url());
      }
    });
    await publicPage.route("https://unpkg.com/react-scan/**", (route) =>
      route.abort()
    );
    await publicPage.goto(`${new URL(page.url()).origin}/share/${binding.id}`);
    await expect(publicPage.getByRole("log")).toContainText(
      "feedback-fixture-ok"
    );
    await expect(publicPage.getByTestId("message-upvote")).toHaveCount(0);
    await expect(publicPage.getByTestId("message-downvote")).toHaveCount(0);
    expect(feedbackRequests).toEqual([]);
    await publicPage.locator("main").screenshot({
      animations: "disabled",
      path: testInfo.outputPath("feedback-shared.png"),
    });
  } finally {
    await anonymous.close();
    await db.delete(eveVote).where(eq(eveVote.conversationId, binding.id));
    await db
      .update(eveConversation)
      .set({ visibility: "private" })
      .where(eq(eveConversation.id, binding.id));
  }
});
/* oxlint-enable typescript/promise-function-async, typescript/strict-void-return */

/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): test("shared feedback controls render unrated, selected and pending states") preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
test("shared feedback controls render unrated, selected and pending states", async ({
  page,
}, testInfo: Readonly<Pick<TestInfo, "outputPath">>) => {
  await page.route("https://unpkg.com/react-scan/**", (route) => route.abort());
  await page.goto("/api/dev-login");
  const styles = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links: readonly { readonly outerHTML: string }[]) =>
      links
        .map((link: { readonly outerHTML: string }) => link.outerHTML)
        .join("")
    );
  const bundleDirectory = testInfo.outputPath("fixture-bundle");
  const bundle = `${bundleDirectory}/eve-feedback-fixture.js`;
  execFileSync("bun", [
    "build",
    "tests/eve-feedback-fixture.tsx",
    "--target=browser",
    "--outdir",
    bundleDirectory,
  ]);
  await page.setContent(
    `<!doctype html><html class="dark"><head>${styles}</head><body class="bg-background text-foreground"><div id="fixture"></div></body></html>`
  );
  await page.addScriptTag({
    content: readFileSync(bundle, "utf-8"),
    type: "module",
  });
  await expect(page.getByTestId("message-upvote")).toHaveCount(4);
  await expect(page.getByTestId("message-upvote").nth(0)).toBeEnabled();
  await expect(page.getByTestId("message-downvote").nth(0)).toBeEnabled();
  await expect(page.getByTestId("message-upvote").nth(1)).toBeDisabled();
  await expect(page.getByTestId("message-downvote").nth(2)).toBeDisabled();
  await expect(page.getByTestId("message-upvote").nth(3)).toBeDisabled();
  await expect(page.getByTestId("message-downvote").nth(3)).toBeDisabled();
  for (const width of [1100, 390]) {
    await page.setViewportSize({ height: 850, width });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath(`feedback-states-${width}.png`),
    });
  }
});
/* oxlint-enable typescript/promise-function-async */
