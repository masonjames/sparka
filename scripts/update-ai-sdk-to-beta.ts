import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJsonPath = "package.json";
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const aiSdkPackages = Object.keys(allDeps).filter((pkg) =>
  pkg.startsWith("@ai-sdk")
);

const aiPackage = Object.keys(allDeps).find((pkg) => pkg === "ai");

const packagesToUpdate: string[] = [];

if (aiSdkPackages.length > 0) {
  packagesToUpdate.push(...aiSdkPackages);
}

if (aiPackage) {
  packagesToUpdate.push(aiPackage);
}

if (packagesToUpdate.length === 0) {
  console.log("No @ai-sdk packages or ai package found");
  process.exit(0);
}

console.log("Found packages to update:");
if (aiSdkPackages.length > 0) {
  console.log(`  @ai-sdk packages (${aiSdkPackages.length}):`);
  for (const pkg of aiSdkPackages) {
    console.log(`    - ${pkg}`);
  }
}
if (aiPackage) {
  console.log(`  - ${aiPackage}`);
}

const packagesToAdd = packagesToUpdate.map((pkg) => `${pkg}@beta`).join(" ");

console.log(
  "\nUpdating package.json and installing @beta versions with pinned versions..."
);
execSync(`bun add --exact ${packagesToAdd}`, { stdio: "inherit" });

// Verify package.json was updated
const updatedPackageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
console.log("\nUpdated versions in package.json:");
for (const pkg of packagesToUpdate) {
  const version =
    updatedPackageJson.dependencies?.[pkg] ??
    updatedPackageJson.devDependencies?.[pkg];
  if (version) {
    console.log(`  ${pkg}: ${version}`);
  }
}

console.log("\nDone!");
