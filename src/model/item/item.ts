import { createId } from "../../utils/create-id.service";
import {
  DESCRIPTION_MAX,
  DM_NOTES_MAX,
  isRecord,
  isValidId,
  NAME_MAX,
  normalizeCategories,
  normalizeDecimal,
  normalizeInt,
  normalizeOptionalText,
  normalizeRequiredText,
  numberOrUndefined,
  stringOrUndefined,
  VALUE_CP_MAX,
  WEIGHT_DECIMALS,
  WEIGHT_MAX,
} from "../common";
import { isRarity, Rarity } from "../rarity";

import { ItemData } from "./item.types";

export const DEFAULT_ITEM_NAME = "New item";

/**
 * Item definition, created once by the GM. Characters own copies of it as
 * `ItemInstance`s.
 *
 * Every value is accessed through get/set accessors. Setters correct invalid
 * input silently (see normalize.service). The accessors are the extension
 * point: a subclass may override a getter (e.g. to hide data of unidentified
 * items) because persistence (`serialize`) reads the private fields directly.
 * Override get and set together (overriding only a getter removes the
 * setter), and override `clone` to keep the subclass.
 */
export class Item implements ItemData {
  // #region Fields
  readonly #id: string;
  #name: string;
  #description: string | undefined;
  #categories: string[] = [];
  #rarity: Rarity | undefined;
  #valueCp: number | undefined;
  #weight: number | undefined;
  #stackable = false;
  #hasInventory = false;
  #dmNotes: string | undefined;
  // #endregion

  // #region Construction
  protected constructor(id: string, name: string) {
    this.#id = id;
    this.#name = normalizeRequiredText(name, NAME_MAX, DEFAULT_ITEM_NAME);
  }

  /** New definition with a fresh id. */
  static create(name: string): Item {
    return new Item(createId(), name);
  }
  // #endregion

  // #region Accessors
  get id(): string {
    return this.#id;
  }

  get name(): string {
    return this.#name;
  }
  set name(value: string) {
    this.#name = normalizeRequiredText(value, NAME_MAX, this.#name);
  }

  get description(): string | undefined {
    return this.#description;
  }
  set description(value: string | undefined) {
    this.#description = normalizeOptionalText(value, DESCRIPTION_MAX);
  }

  get categories(): readonly string[] {
    return [...this.#categories];
  }
  set categories(value: readonly string[]) {
    this.#categories = normalizeCategories(value);
  }

  get rarity(): Rarity | undefined {
    return this.#rarity;
  }
  set rarity(value: Rarity | undefined) {
    this.#rarity = isRarity(value) ? value : undefined;
  }

  /** Value in copper pieces (1 gp = 100 cp). */
  get valueCp(): number | undefined {
    return this.#valueCp;
  }
  set valueCp(value: number | undefined) {
    this.#valueCp =
      value === undefined
        ? undefined
        : normalizeInt(value, 0, VALUE_CP_MAX, this.#valueCp);
  }

  /** Weight of one piece in pounds. */
  get weight(): number | undefined {
    return this.#weight;
  }
  set weight(value: number | undefined) {
    this.#weight =
      value === undefined
        ? undefined
        : normalizeDecimal(value, 0, WEIGHT_MAX, WEIGHT_DECIMALS, this.#weight);
  }

  /** Whether instances track a quantity (arrows) or are unique (backpack). */
  get stackable(): boolean {
    return this.#stackable;
  }
  set stackable(value: boolean) {
    this.#stackable = value === true;
  }

  /** Whether instances can contain other instances (backpack, bag of holding). */
  get hasInventory(): boolean {
    return this.#hasInventory;
  }
  set hasInventory(value: boolean) {
    this.#hasInventory = value === true;
  }

  /** GM-only notes. Hidden in the UI only, not secret (see deviations.md). */
  get dmNotes(): string | undefined {
    return this.#dmNotes;
  }
  set dmNotes(value: string | undefined) {
    this.#dmNotes = normalizeOptionalText(value, DM_NOTES_MAX);
  }
  // #endregion

  // #region Serialization
  /** Plain JSON for storage. Reads private fields, so getter overrides never leak into storage. */
  serialize(): ItemData {
    const data: ItemData = {
      id: this.#id,
      name: this.#name,
      stackable: this.#stackable,
      hasInventory: this.#hasInventory,
    };
    if (this.#description !== undefined) data.description = this.#description;
    if (this.#categories.length > 0) data.categories = [...this.#categories];
    if (this.#rarity !== undefined) data.rarity = this.#rarity;
    if (this.#valueCp !== undefined) data.valueCp = this.#valueCp;
    if (this.#weight !== undefined) data.weight = this.#weight;
    if (this.#dmNotes !== undefined) data.dmNotes = this.#dmNotes;
    return data;
  }

  /**
   * Builds a definition from untrusted data (storage, broadcast, import).
   * Returns `undefined` without a valid id or name; fields of the wrong type
   * are dropped, everything else is normalized by the setters.
   */
  static deserialize(value: unknown): Item | undefined {
    if (!isRecord(value) || !isValidId(value.id)) return undefined;
    const name = normalizeRequiredText(value.name, NAME_MAX, "");
    if (name === "") return undefined;

    const item = new Item(value.id, name);
    item.description = stringOrUndefined(value.description);
    item.categories = Array.isArray(value.categories)
      ? value.categories.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [];
    item.rarity = isRarity(value.rarity) ? value.rarity : undefined;
    item.valueCp = numberOrUndefined(value.valueCp);
    item.weight = numberOrUndefined(value.weight);
    item.stackable = value.stackable === true;
    item.hasInventory = value.hasInventory === true;
    item.dmNotes = stringOrUndefined(value.dmNotes);
    return item;
  }

  /** Independent copy with the same id. */
  clone(): Item {
    const copy = new Item(this.#id, this.#name);
    copy.#description = this.#description;
    copy.#categories = [...this.#categories];
    copy.#rarity = this.#rarity;
    copy.#valueCp = this.#valueCp;
    copy.#weight = this.#weight;
    copy.#stackable = this.#stackable;
    copy.#hasInventory = this.#hasInventory;
    copy.#dmNotes = this.#dmNotes;
    return copy;
  }
  // #endregion
}
