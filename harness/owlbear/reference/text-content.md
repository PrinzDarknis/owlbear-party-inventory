# TextContent

> SDK 3.1.0 · Sources: docs "Reference / TextContent" (provided by the user 2026-10-06), `lib/types/items/TextContent.d.ts` · Updated: 2026-10-06

## Purpose
`TextContent` describes text on items: `TEXT` items, `LABEL` items and the text block of `IMAGE` items (token names). It supports **plain** text (faster rendering) or **rich** text (headings, lists, bold, italic).

## Structure
```ts
interface TextContent {
  type: "PLAIN" | "RICH";          // PLAIN uses a faster rendering path
  plainText: string;               // used when type = "PLAIN"
  richText: Descendant[];          // used when type = "RICH"
  style: TextStyle;
  width: number | "AUTO";          // px or automatic from the content
  height: number | "AUTO";
}
interface TextStyle {
  fillColor: string; fillOpacity: number;              // 0..1
  strokeColor: string; strokeOpacity: number; strokeWidth: number;   // px
  textAlign: "LEFT" | "CENTER" | "RIGHT"; textAlignVertical: "BOTTOM" | "MIDDLE" | "TOP";
  fontFamily: string; fontSize: number; fontWeight: number;          // px / numeric weight
  lineHeight: number;                                  // relative to the font size
  padding: number;                                     // px
}
// Rich text = Slate-like node tree
type Descendant = Element | { text: string; bold?: boolean; italic?: boolean };
type Element = { type: "paragraph" | "heading-one" | "heading-two"
                     | "bulleted-list" | "numbered-list" | "list-item"; children: Descendant[] };
```
Example: `[{ type: "paragraph", children: [{ text: "Regular " }, { text: "Bold", bold: true }] }]`

The SDK also exports the guards `isElement` and `isFormattedText` to walk rich text safely.

## Implementation in this harness
- Create text through builders: `buildText().plainText("…")`, `buildLabel().plainText("…")`, or the text setters of `buildImage` ([builders.md](builders.md)). Prefer `PLAIN` unless formatting is needed.
- **Reading text:** for `RICH`, flatten it with a small pure helper in `src/utils/` (walk `children`, concatenate `text`) and test that helper.
- **Writing user-provided text:** only into `plainText` or text nodes. The text is rendered by Owlbear, not as HTML, so injection into the canvas is not a concern. Still, limit the length.
- Colors: use theme-independent, readable colors on maps (fill + stroke for contrast).

## Pitfalls and limits
- Changing `plainText` has no visible effect while `type` is `"RICH"`, and vice versa. Set both `type` and the matching field.
- Token names live in `image.text.plainText` on `IMAGE` items. Users edit them, so don't use them as identifiers (use ids and metadata).
- `width/height: "AUTO"` resizes with the content; fixed px values cut or wrap long text.

## Claude workflow
- Ask the user: plain or formatted text? Size behavior (auto vs fixed)? Who may edit it?
- Live test (by the user): the text renders readably on light and dark maps; long text behaves as expected; edits by the user don't break the extension.
