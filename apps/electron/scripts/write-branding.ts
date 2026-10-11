import { config } from "@/lib/config";
import { writeFile } from "node:fs/promises";

const { appName, appPrefix, appUrl, organization } = config;
const orgEmail =
  organization.contact?.privacyEmail || organization.contact?.legalEmail;

const JSON_INDENTATION_SPACES = 2;
const FAILURE_EXIT_CODE = 1;

const brandingJson = JSON.stringify(
  { appName, appPrefix, appUrl, orgEmail, orgName: organization.name },
  null,
  JSON_INDENTATION_SPACES
);
const writeBranding = async (): Promise<void> => {
  await writeFile(new URL("../branding.json", import.meta.url), brandingJson);
  console.log("branding.json written:", { appName, appPrefix, appUrl });
};
// The generated Node/tsx prebuild runs this file in a CommonJS package, which
// cannot use top-level await. Handle the entry promise and report write failures.
// oxlint-disable-next-line promise/prefer-await-to-then, promise/prefer-await-to-callbacks -- CommonJS requires this handled asynchronous entry point; top-level await fails the Node/tsx prebuild transform.
writeBranding().catch((error: unknown): void => {
  console.error(error);
  process.exitCode = FAILURE_EXIT_CODE;
});
