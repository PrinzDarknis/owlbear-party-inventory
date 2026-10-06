import { createId } from "../../utils/create-id.service";
import {
  ALIAS_MAX,
  isRecord,
  isValidId,
  normalizeInt,
  normalizeOptionalText,
  NOTES_MAX,
  numberOrUndefined,
  QUANTITY_MAX,
  stringOrUndefined,
} from "../common";
import { Item } from "../item";
import {
  copyLocation,
  ItemLocation,
  parseLocation,
  UNASSIGNED,
} from "../location";

import { ItemInstanceData } from "./item-instance.types";

/**
 * One copy of an `Item`, owned by a character or inside a container instance.
 *
 * Same accessor rules as `Item`: setters correct invalid input silently,
 * persistence reads private fields, and subclasses override get and set
 * together (overriding only a getter removes the setter).
 */
export class ItemInstance implements ItemInstanceData {
  // #region Fields
  readonly #id: string;
  readonly #itemId: string;
  #location: ItemLocation = UNASSIGNED;
  #alias: string | undefined;
  #notes: string | undefined;
  #quantity = 1;
  #item: Item | undefined;
  // #endregion

  // #region Construction
  protected constructor(id: string, itemId: string) {
    this.#id = id;
    this.#itemId = itemId;
  }

  /** New instance of `itemId` with a fresh id. */
  static create(
    itemId: string,
    location: ItemLocation = UNASSIGNED,
    quantity = 1,
  ): ItemInstance {
    const instance = new ItemInstance(createId(), itemId);
    instance.location = location;
    instance.quantity = quantity;
    return instance;
  }
  // #endregion

  // #region Accessors
  get id(): string {
    return this.#id;
  }

  get itemId(): string {
    return this.#itemId;
  }

  get location(): ItemLocation {
    return copyLocation(this.#location);
  }
  set location(value: ItemLocation) {
    this.#location = copyLocation(value);
  }

  /** Distinguishes several instances of the same item. */
  get alias(): string | undefined {
    return this.#alias;
  }
  set alias(value: string | undefined) {
    this.#alias = normalizeOptionalText(value, ALIAS_MAX);
  }

  /** Player notes. */
  get notes(): string | undefined {
    return this.#notes;
  }
  set notes(value: string | undefined) {
    this.#notes = normalizeOptionalText(value, NOTES_MAX);
  }

  /** Effective quantity: always 1 for non-stackable items; the stored value while unbound. */
  get quantity(): number {
    if (this.#item && !this.#item.stackable) return 1;
    return this.#quantity;
  }
  set quantity(value: number) {
    this.#quantity = normalizeInt(value, 0, QUANTITY_MAX, this.#quantity);
  }

  /** Stored quantity, independent of the bound item. */
  get rawQuantity(): number {
    return this.#quantity;
  }
  // #endregion

  // #region Item binding
  /** Binds the definition this instance refers to. Ignored if the id doesn't match. */
  bindItem(item: Item): void {
    if (item.id === this.#itemId) this.#item = item;
  }

  /** The bound definition (set by the manager via `bindItem`). */
  get item(): Item | undefined {
    return this.#item;
  }

  /** Whether other instances may be placed inside this one. */
  get canHoldItems(): boolean {
    return this.#item?.hasInventory ?? false;
  }
  // #endregion

  // #region Serialization
  /** Plain JSON for storage. */
  serialize(): ItemInstanceData {
    const data: ItemInstanceData = {
      id: this.#id,
      itemId: this.#itemId,
      location: copyLocation(this.#location),
      quantity: this.#quantity,
    };
    if (this.#alias !== undefined) data.alias = this.#alias;
    if (this.#notes !== undefined) data.notes = this.#notes;
    return data;
  }

  /**
   * Builds an instance from untrusted data (storage, broadcast, import).
   * Returns `undefined` without a valid id or item id; fields of the wrong
   * type are dropped, everything else is normalized by the setters.
   */
  static deserialize(value: unknown): ItemInstance | undefined {
    if (!isRecord(value) || !isValidId(value.id) || !isValidId(value.itemId)) {
      return undefined;
    }
    const instance = new ItemInstance(value.id, value.itemId);
    instance.location = parseLocation(value.location);
    instance.alias = stringOrUndefined(value.alias);
    instance.notes = stringOrUndefined(value.notes);
    const quantity = numberOrUndefined(value.quantity);
    if (quantity !== undefined) instance.quantity = quantity;
    return instance;
  }

  /** Independent copy with the same id; keeps the bound item. */
  clone(): ItemInstance {
    const copy = new ItemInstance(this.#id, this.#itemId);
    copy.#location = this.#location;
    copy.#alias = this.#alias;
    copy.#notes = this.#notes;
    copy.#quantity = this.#quantity;
    copy.#item = this.#item;
    return copy;
  }
  // #endregion
}
