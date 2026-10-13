# Overview

## Purpose

Replaces a shared spreadsheet for managing the inventories of a D&D party. Every character has an inventory tab that all users can see. The GM maintains a catalog of item definitions, hands out item instances to characters and can attach GM notes that players don't see in the UI. Items can contain other items (backpack, bag of holding), so inventories nest recursively.

The plugin runs inside Owlbear (Owlbear storage, multi-user) and also as a standalone browser tab (localStorage, single user). The standalone mode is used for development and automated testing without Owlbear.

## Features

| Feature                                                                                    | Who                                                 | Where (UI / background)  | Main code                                                              |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Storage selection on start (auto Owlbear inside Owlbear)                                   | both                                                | popover / standalone tab | `src/components/storage-select/` (planned), `src/storage/registry/`    |
| Storage controllers: memory, local (localStorage, cross-tab), Owlbear (phase 5)            | both                                                | popover / standalone tab | `src/storage/`                                                         |
| Inventory manager: state, tree, weight, rights, commands, view as player, clear local data | both                                                | popover / standalone tab | `src/manager/`                                                         |
| Character tabs with recursive inventory                                                    | both (view), players move instances and write notes | popover                  | `src/components/character-tab/`, `src/components/inventory/` (planned) |
| Item catalog: create, edit, delete definitions, assign instances                           | GM                                                  | popover, GM tab          | `src/components/dm/` (planned)                                         |
| GM text server (descriptions, notes)                                                       | GM client                                           | background               | `src/storage/backends/owlbear/text-server/` (planned, phase 5)         |

## Roles

- GM: manages characters and item definitions, creates and deletes instances, changes quantities, undoes uses, sees and edits GM notes.
- Player: sees all inventories, moves instances between characters and containers (whole or partial stacks), merges stacks, marks pieces of a stack as used, writes player notes on instances.
- Role checks are UX only (see `harness/core/03-obr-sdk-guide.md` §Roles and trust). In local mode the user is GM and can switch to a player view.

## Scripts

| Script           | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`    | Dev server (`/manifest.dev.json` for Owlbear, `/html/popover.html` as standalone tab) |
| `npm run build`  | Type check + build                                                                    |
| `npm run lint`   | ESLint                                                                                |
| `npm run test`   | Vitest (`src/**/*.test.ts`)                                                           |
| `npm run deploy` | Version bump + build + publish                                                        |
