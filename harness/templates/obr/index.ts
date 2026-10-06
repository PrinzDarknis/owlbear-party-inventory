// Copy to src/obr/index.ts. Components and hooks import from here, never from the SDK.
import { exampleService } from "./obr-example.service";
import { menuService } from "./obr-menu.service";
import { sessionService } from "./obr-session.service";
import { isGM, obrReady, sceneReady } from "./obr";

export * from "./constants";
export type { PlayerRole } from "./obr-session.service";
export type { Theme } from "@owlbear-rodeo/sdk";

/** Facade over the Owlbear SDK. One property per domain service. */
export const api = {
  ready: obrReady,
  sceneReady,
  isGM,
  session: sessionService,
  menu: menuService,
  example: exampleService,
};
