#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoUrl =
  process.env.DEPLOY_REPO_URL || "https://github.com/oionus/easyzine.git";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/easyzine";
const outDir = join(process.cwd(), "out");

console.log(`1/3 Building static site with NEXT_PUBLIC_BASE_PATH="${basePath}"...`);
execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
});

if (!existsSync(outDir)) {
  throw new Error("Build output ./out directory was not created.");
}

// Ensure .nojekyll exists so GitHub Pages serves /_next/* assets
writeFileSync(join(outDir, ".nojekyll"), "");

console.log("2/3 Preparing gh-pages commit in ./out...");
execSync("git init", { cwd: outDir, stdio: "inherit" });
execSync("git checkout -B gh-pages", { cwd: outDir, stdio: "inherit" });
execSync("git add -A", { cwd: outDir, stdio: "inherit" });
execSync('git commit -m "deploy: publish EasyZine static build to gh-pages"', {
  cwd: outDir,
  stdio: "inherit",
});

console.log(`3/3 Pushing ./out to ${repoUrl} (branch: gh-pages)...`);
execSync(`git push -f ${repoUrl} gh-pages:gh-pages`, {
  cwd: outDir,
  stdio: "inherit",
});

console.log("\nDeployed successfully to branch gh-pages!");
console.log("Visit: https://oionus.github.io/easyzine/");
