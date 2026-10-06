// Copy to src/main-background.ts. No React here: register menus, tools and global listeners.
import { api } from "./obr";

async function setup(): Promise<void> {
  await api.ready;

  // Context menus and tools are registered once, from the background.
  await api.menu.registerExampleMenu((itemIds) => {
    console.info("[plugin] menu clicked for", itemIds.length, "items");
  });

  // Background-only listeners (fire once per client).
  await api.example.onEvent((event) => {
    console.info("[plugin] event", event.type);
  });
  await api.example.watchLinkedItems(async () => {
    // derive and save data here; the loop guard is in the service
  });
}

setup().catch((error) =>
  console.error("[plugin] background setup failed", error),
);
