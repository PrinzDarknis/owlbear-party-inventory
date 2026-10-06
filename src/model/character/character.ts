import { createId } from "../../utils/create-id.service";
import {
  CHARACTER_NAME_MAX,
  isRecord,
  isValidId,
  normalizeRequiredText,
} from "../common";

import { CharacterData } from "./character.types";

export const DEFAULT_CHARACTER_NAME = "New character";

/**
 * A player character, created by the GM. Not linked to Owlbear players, so no
 * personal data is stored. Same accessor rules as `Item`.
 */
export class Character implements CharacterData {
  // #region Fields
  readonly #id: string;
  #name: string;
  // #endregion

  // #region Construction
  protected constructor(id: string, name: string) {
    this.#id = id;
    this.#name = normalizeRequiredText(
      name,
      CHARACTER_NAME_MAX,
      DEFAULT_CHARACTER_NAME,
    );
  }

  /** New character with a fresh id. */
  static create(name: string): Character {
    return new Character(createId(), name);
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
    this.#name = normalizeRequiredText(value, CHARACTER_NAME_MAX, this.#name);
  }
  // #endregion

  // #region Serialization
  /** Plain JSON for storage. */
  serialize(): CharacterData {
    return { id: this.#id, name: this.#name };
  }

  /** Builds a character from untrusted data. Returns `undefined` without a valid id or name. */
  static deserialize(value: unknown): Character | undefined {
    if (!isRecord(value) || !isValidId(value.id)) return undefined;
    const name = normalizeRequiredText(value.name, CHARACTER_NAME_MAX, "");
    if (name === "") return undefined;
    return new Character(value.id, name);
  }

  /** Independent copy with the same id. */
  clone(): Character {
    return new Character(this.#id, this.#name);
  }
  // #endregion
}
