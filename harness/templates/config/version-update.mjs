// Copy to ./version-update.mjs. Usage: node ./version-update.mjs [patch|minor|major]
// Keeps package.json and both manifests on the same SemVer version.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const FILES = [
  resolve(root, "package.json"),
  resolve(root, "public", "manifest.json"),
  resolve(root, "public", "manifest.dev.json"),
];

/** @param {string} version @param {"patch"|"minor"|"major"} part */
function bump(version, part) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid version "${version}"`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (part === "major") [major, minor, patch] = [major + 1, 0, 0];
  else if (part === "minor") [minor, patch] = [minor + 1, 0];
  else patch += 1;
  return `${major}.${minor}.${patch}`;
}

const part = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(part)) {
  throw new Error(`Unknown bump "${part}" (use patch, minor or major)`);
}

const current = JSON.parse(await readFile(FILES[0], "utf8")).version;
const next = bump(current, part);

for (const file of FILES) {
  const data = JSON.parse(await readFile(file, "utf8"));
  data.version = next;
  await writeFile(file, `${JSON.stringify(data, undefined, 2)}\n`);
}
console.log(`version ${current} -> ${next}`);
