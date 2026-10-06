// Copy to src/obr/obr-<domain>.service.ts. One service per domain.
import OBR, { Item, Metadata } from "@owlbear-rodeo/sdk";

import { Example, parseExample } from "../model/example";
import { debounce } from "../utils/debounce.service";

import {
  BROADCAST_EXAMPLE,
  METADATA_RECORD,
  PLUGIN_ID,
  ROOM_METADATA_BUDGET_BYTES,
} from "./constants";
import { jsonSize, obrReady, sceneReady } from "./obr";

const RECORD_PREFIX = METADATA_RECORD("");
const ITEM_LINK_KEY = `${PLUGIN_ID}/record-id`;

/** Allowlisted broadcast events. Anything else is ignored. */
export type ExampleEvent = { type: "ping"; recordId: string };

function parseExampleEvent(data: unknown): ExampleEvent | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const event = data as Record<string, unknown>;
  if (event.type === "ping" && typeof event.recordId === "string") {
    return { type: "ping", recordId: event.recordId };
  }
  return undefined;
}

function extractRecords(metadata: Metadata): Example[] {
  const records: Example[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith(RECORD_PREFIX)) continue;
    const record = parseExample(value);
    if (record) records.push(record);
  }
  return records;
}

export const exampleService = {
  async loadAll(): Promise<Example[]> {
    await obrReady;
    return extractRecords(await OBR.room.getMetadata());
  },

  /** Debounced. Resolves after the write has happened. */
  save(record: Example): Promise<void> {
    return debounce(`${PLUGIN_ID}/save/${record.id}`, async () => {
      await obrReady;
      const next = { ...record, updatedAt: new Date().toISOString() };
      const metadata = await OBR.room.getMetadata();
      const ownSize = Object.entries(metadata)
        .filter(([key]) => key.startsWith(PLUGIN_ID))
        .reduce((sum, [, value]) => sum + jsonSize(value), 0);
      if (ownSize + jsonSize(next) > ROOM_METADATA_BUDGET_BYTES) {
        await OBR.notification.show("Storage limit reached.", "ERROR");
        throw new Error("room metadata budget exceeded");
      }
      await OBR.room.setMetadata({ [METADATA_RECORD(record.id)]: next });
    });
  },

  async remove(id: string): Promise<void> {
    await obrReady;
    await OBR.room.setMetadata({ [METADATA_RECORD(id)]: undefined });
  },

  /** Returns the unsubscribe function. */
  async subscribe(onChange: (records: Example[]) => void): Promise<() => void> {
    await obrReady;
    return OBR.room.onMetadataChange((metadata) =>
      onChange(extractRecords(metadata)),
    );
  },

  async sendEvent(event: ExampleEvent): Promise<void> {
    await obrReady;
    await OBR.broadcast.sendMessage(BROADCAST_EXAMPLE, event, {
      destination: "REMOTE",
    });
  },

  async onEvent(handler: (event: ExampleEvent) => void): Promise<() => void> {
    await obrReady;
    return OBR.broadcast.onMessage(BROADCAST_EXAMPLE, ({ data }) => {
      const event = parseExampleEvent(data);
      if (event) handler(event);
    });
  },

  /**
   * Background only: reacts to item changes. The loop guard ensures only the
   * client that changed the item writes derived data.
   */
  async watchLinkedItems(
    onLinkedItemChanged: (item: Item, recordId: string) => Promise<void>,
  ): Promise<() => void> {
    await sceneReady();
    return OBR.scene.items.onChange(async (items) => {
      for (const item of items) {
        if (item.lastModifiedUserId !== OBR.player.id) continue; // loop guard
        const recordId = item.metadata[ITEM_LINK_KEY];
        if (typeof recordId !== "string" || !recordId) continue;
        await onLinkedItemChanged(item, recordId);
      }
    });
  },
};
