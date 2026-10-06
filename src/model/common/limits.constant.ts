// Upper bounds for all user-entered values. They keep stored records small
// (room metadata budget) and one item's texts below the 16 KB broadcast limit.

export const ID_MAX = 64;

export const NAME_MAX = 100;
export const ALIAS_MAX = 100;
export const CHARACTER_NAME_MAX = 60;

export const DESCRIPTION_MAX = 3000;
export const DM_NOTES_MAX = 1500;
export const NOTES_MAX = 1500;

export const CATEGORY_MAX = 30;
export const CATEGORIES_MAX_COUNT = 10;

/** Value in copper pieces (1 gp = 100 cp). */
export const VALUE_CP_MAX = 1_000_000_000;
/** Weight in pounds. */
export const WEIGHT_MAX = 100_000;
export const WEIGHT_DECIMALS = 2;
export const QUANTITY_MAX = 99_999;
