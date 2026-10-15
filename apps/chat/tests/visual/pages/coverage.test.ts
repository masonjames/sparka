import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "../../..");
const appDir = path.join(appRoot, "app");
const ROUTE_FILE =
  /^(?:page|layout|loading|error|not-found|global-error)\.tsx$/u;

// Route files that render nothing of their own, so there is nothing to capture.
const NOT_RENDERED = new Set([
  // The <html> shell; renderRoute mounts its body providers around every page.
  "layout.tsx",
  // Redirects to /chat/[id].
  "(chat)/project/[projectId]/chat/[chatId]/page.tsx",
]);

const importedRouteFiles = (file: string) =>
  Array.from(
    readFileSync(file, "utf-8").matchAll(/\bfrom "@\/app\/(?<route>[^"]+)"/gu),
    (match) => `${match.groups?.route}.tsx`
  );

test("every route file is rendered by a visual test", () => {
  const visualTests = readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith(".browser.tsx"))
    .map((file) => path.join(import.meta.dirname, file));
  const rendered = new Set(visualTests.flatMap(importedRouteFiles));

  const untested = readdirSync(appDir, { encoding: "utf-8", recursive: true })
    .map((route) => route.split(path.sep).join("/"))
    .filter((route) => ROUTE_FILE.test(path.basename(route)))
    // Fixture pages for the Playwright screenshot tests, served only under PLAYWRIGHT.
    .filter((route) => !route.startsWith("(chat)/visual-fixtures/"))
    .filter((route) => !(NOT_RENDERED.has(route) || rendered.has(route)))
    .toSorted();

  expect(untested).toEqual([]);
});
