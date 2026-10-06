// No React here: register menus, tools and global listeners.
import { api } from "./obr";

async function setup(): Promise<void> {
  await api.ready;

  // Background-only listeners (fire once per client) are registered here,
  // e.g. the GM text server for the Owlbear storage (roadmap phase 5).
}

setup().catch((error) =>
  console.error("[party-inventory] background setup failed", error),
);
