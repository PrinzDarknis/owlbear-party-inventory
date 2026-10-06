// Copy to src/obr/obr-menu.service.ts. Context menus and tools are registered from the background.
import OBR from "@owlbear-rodeo/sdk";

import { assetUrl, CONTEXT_MENU_EXAMPLE } from "./constants";
import { obrReady } from "./obr";

export const menuService = {
  /** GM-only entry on items of the CHARACTER layer. Roles filter = UX, not security. */
  async registerExampleMenu(
    onClick: (itemIds: string[]) => void,
  ): Promise<void> {
    await obrReady;
    await OBR.contextMenu.create({
      id: CONTEXT_MENU_EXAMPLE,
      icons: [
        {
          icon: assetUrl("icon.svg"),
          label: "Example action",
          filter: {
            every: [{ key: "layer", value: "CHARACTER" }],
            roles: ["GM"],
          },
        },
      ],
      onClick: (context) => onClick(context.items.map((item) => item.id)),
      // For an inline UI instead of onClick:
      // embed: { url: assetUrl("html/context-menu/example.html"), height: 50 },
    });
  },
};
