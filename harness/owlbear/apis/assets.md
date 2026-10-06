# Assets API (uploads and pickers)

> SDK 3.1.0 · Sources: docs "APIs / Assets" (provided by the user 2026-10-06), `lib/api/AssetsApi.d.ts`, `lib/builders/{ImageUpload,SceneUpload}Builder.d.ts` · Updated: 2026-10-06

## Purpose
Interacts with the **user's Owlbear storage**:
- **Upload** images or whole scenes created by the extension into the user's library (the user picks the target folder).
- **Pick** existing images or scenes from the user's library and hand them to the extension (e.g. "choose a token image").

## API
```ts
OBR.assets.uploadImages(images: ImageUpload[], typeHint?: ImageAssetType): Promise<void>;   // opens a folder picker
OBR.assets.uploadScenes(scenes: SceneUpload[], disableShowScenes?: boolean): Promise<void>;
OBR.assets.downloadImages(multiple?: boolean, defaultSearch?: string, typeHint?: ImageAssetType): Promise<ImageDownload[]>;
OBR.assets.downloadScenes(multiple?: boolean, defaultSearch?: string): Promise<SceneDownload[]>;
type ImageAssetType = "MAP" | "PROP" | "MOUNT" | "CHARACTER" | "ATTACHMENT" | "NOTE";
```
- `ImageUpload` (via `buildImageUpload(file)`): `file`, `name`, `grid`, `rotation`, `scale`, `text`, `textItemType` ("LABEL" = label below, "TEXT" = text over the image), `visible`, `locked`, `description`.
- `SceneUpload` (via `buildSceneUpload()`): `name`, `grid`, `fog`, `items`, `baseMap` (ImageUpload), `thumbnail`.
- `ImageDownload`: `name`, `image` (ImageContent with url), `grid`, `rotation`, `scale`, `text`, `textItemType`, `visible`, `locked`, `description`, `type`. Ready for `buildImage(download.image, download.grid)`.
- `SceneDownload`: `name`, `grid`, `fog`, `items`.

## Implementation in this harness
- **File input → upload:** copy the file first. The docs require this because of browser security policies for sharing files:
  ```ts
  const data = await file.arrayBuffer();
  const copy = new File([data], file.name, { type: file.type });
  await OBR.assets.uploadImages([buildImageUpload(copy).name(file.name).build()], "CHARACTER");
  ```
- **"Choose an image" UI:** `downloadImages(false, "", "CHARACTER")` → build items with `buildImage(img.image, img.grid)` and set the layer from `img.type`. No external image URLs needed.
- **Generated scenes** (importers, templates): `buildSceneUpload().name(…).gridType(…).items([...]).baseMap(…)` → `uploadScenes`.
- All of this belongs in a service (`obr-assets.service.ts`). Pickers open Owlbear UI, so call them only from a user click in a UI iframe.

## Pitfalls and limits
- Uploads use the **user's storage quota**. Ask before uploading, and never upload in the background without an action.
- Validate files before uploading: type (`image/*`), size limit, count. Files are user data, so don't send them anywhere else.
- Downloaded image URLs point to the user's assets. Store only what you need (ids or urls in item metadata), not copies.

## Claude workflow
- Ask the user: upload or pick? Which asset type? One or many? Should the Atlas be shown after uploading scenes?
- Live test (by the user): the picker opens with the right filter, the chosen image creates a correct token, the uploaded image appears in the chosen folder, and cancelling the picker causes no errors.
