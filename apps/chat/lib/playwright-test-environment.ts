const isEnabledFlag = (value: string | undefined): boolean => {
  if (typeof value !== "string" || value === "") {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalizedValue);
};
/* oxlint-disable typescript/strict-boolean-expressions --
 * typescript/strict-boolean-expressions (#610): isPlaywrightTestEnvironment intentionally keeps the existing falsy-value behavior of env.PLAYWRIGHT_TEST_BASE_URL; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
export const isPlaywrightTestEnvironment = (
  env: Readonly<NodeJS.ProcessEnv> = process.env
): boolean =>
  Boolean(
    // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- #602: An empty environment value means unset here and must fall back to the configured default.
    env.PLAYWRIGHT_TEST_BASE_URL ||
    isEnabledFlag(env.PLAYWRIGHT) ||
    isEnabledFlag(env.CI_PLAYWRIGHT)
  );
/* oxlint-enable typescript/strict-boolean-expressions */
