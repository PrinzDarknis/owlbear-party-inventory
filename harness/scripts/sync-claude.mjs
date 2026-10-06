// Mirrors harness/claude/ into .claude/ so Claude Code picks up skills and settings.
// Usage (from repo root): node harness/scripts/sync-claude.mjs
// - harness/claude/skills/**   -> .claude/skills/**
// - harness/claude/settings.json -> .claude/settings.json
// Never touches .claude/settings.local.json (personal settings). Never deletes files.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const harnessDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(harnessDir, "..");
const sourceDir = join(harnessDir, "claude");
const targetDir = join(repoRoot, ".claude");

const MAPPINGS = [
  { from: join(sourceDir, "skills"), to: join(targetDir, "skills") },
  {
    from: join(sourceDir, "settings.json"),
    to: join(targetDir, "settings.json"),
  },
];

/** @returns {Promise<string[]>} all files below path (or [path] if it is a file) */
async function listFiles(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? listFiles(join(path, entry.name))
          : [join(path, entry.name)],
      ),
    );
    return nested.flat();
  } catch (error) {
    if (error.code === "ENOTDIR") return [path];
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readOrNull(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const summary = { created: [], updated: [], unchanged: [] };

for (const { from, to } of MAPPINGS) {
  for (const file of await listFiles(from)) {
    const target = from === file ? to : join(to, relative(from, file));
    const content = await readFile(file);
    const existing = await readOrNull(target);
    const label = relative(repoRoot, target);

    if (existing && existing.equals(content)) {
      summary.unchanged.push(label);
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
    summary[existing ? "updated" : "created"].push(label);
  }
}

for (const [state, files] of Object.entries(summary)) {
  console.log(`${state}: ${files.length}`);
  if (state !== "unchanged") files.forEach((file) => console.log(`  ${file}`));
}
