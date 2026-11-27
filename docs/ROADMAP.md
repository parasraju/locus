# Locus roadmap

This file is the ordered list of Locus work, including work that already ships. The order is the pick-up order for the Coder and Tester bots.

## Now

Pick up these open `locus-bot` issues in this order.

1. [Trash overwrites a same-named note trashed on the same day](https://github.com/parasraju/locus/issues/1). Bug.
2. [Vault walker indexes node_modules and other ignored folders](https://github.com/parasraju/locus/issues/2). Bug and performance.
3. [Every save re-walks the whole vault and empties the content cache](https://github.com/parasraju/locus/issues/3). Performance.
4. [Vault search pane (slice 1): search all notes from a sidebar pane](https://github.com/parasraju/locus/issues/4). Feature.
5. [Note titles are wrong for files with Windows line endings](https://github.com/parasraju/locus/issues/5). Bug.
6. [Trash view and restore (slice 1): list and restore trashed notes](https://github.com/parasraju/locus/issues/6). Feature. This issue depends on #1.
7. [Templates (slice 1): insert a note from the Templates folder](https://github.com/parasraju/locus/issues/7). Feature.
8. [Add a CI workflow that runs typecheck and build on pull requests](https://github.com/parasraju/locus/issues/8). Infra.

## Next

Build these milestones after the list above, in the heading order. The order is user value. Search is first because opening a note makes the Links tab call `searchNotes`. Daily notes and tags come next, then export, import, and the macOS and Linux installers.

### Faster search index

`searchNotes` in `app/electron/main.cjs` walks `cachedEntries` and reads the Markdown files. It tests the query as a regular expression. The loop stops after 5000 Markdown files (`MAX_SEARCH_FILES`) or 200 results (`MAX_SEARCH_RESULTS`). The Links tab in `RightPanel.tsx` calls `api().search.notes` on the open note. Issue #4 covers the search pane on that same call. ADR-005 in `PRD.md` chooses SQLite FTS5 in app user-data. It also chooses a separate filename index for the quick switcher. Boolean queries and saved searches in FR-08 come after these three slices.

Build the index in this order.

1. Build the full-text index when a vault opens. Update that index from `startWatcher` when one file changes. A full re-index of 100k notes takes at most 8 seconds (PF-08 in section 7.1). That row is for one full run. An update of one file takes at most 500 ms (PF-08). FR-08.
2. Make `searchNotes` read that index. A full-text query over 100k notes takes at most 150 ms (PF-06 in section 7.1). FR-08.
3. Answer Ctrl+O filename queries in `CommandPalette` from the filename index. A match takes at most 50 ms (PF-07 in section 7.1). FR-08.1.

### Daily note templates

`openDaily` in `App.tsx` opens `YYYY-MM-DD.md` in the vault root and creates that file when it is missing. The new file is a heading with that date. Issue #7 inserts a file from `Templates/` at the cursor and replaces `{{date}}` and `{{title}}`. These slices start after that issue. Rendering a template and inserting it takes at most 100 ms (PF-20 in section 7.1) on each slice below.

Build the daily note and the rest of templates in this order.

1. Add a command that creates a new note from a file in `Templates/`. FR-10.1.
2. When today's note is missing, create it from a daily-note template. Store the folder and the date pattern in settings. Opening that note again on the same day leaves the file unchanged. FR-09.2 and FR-09.3.
3. Resolve `{{time}}`, formatted dates, relative dates such as `{{date:+1d}}`, `{{folder}}`, and `{{note}}` at insert time. FR-10.2, FR-10.3, and FR-10.4.
4. Add previous-day and next-day commands. Each command opens that day's note. It creates the note from the same template when the file is missing. FR-09.4.

### Tags

`extractTags` in `RightPanel.tsx` collects `#` words from the open note and shows them on the Properties tab. The scan covers the whole note string. A `#` word inside a code fence is included. A frontmatter list such as `tags: [a]` never reaches `extractTags`. The sidebar has no tag tree.

Build tags in this order.

1. Parse `#tag` and `#parent/child` in note text. Skip code spans, code fences, URLs, and heading markers. FR-07.1.
2. Merge frontmatter `tags` with the inline tags and show both on the note. FR-07.2.
3. Add a nested tag list in the sidebar, with a count on each tag. Choosing a tag shows the notes that contain it. FR-07.3.
4. Filter by tag from the sidebar, from the command palette, and with a `tag:` query on the search index above. FR-07.4.
5. Autocomplete `#` in the editor to an existing tag path. FR-07.5.

Vault-wide tag rename is FR-07.6. Schedule it after these slices.

### Export to HTML and PDF

The command list in `App.tsx` has no export command.

Build export in this order.

1. Export the active note to one HTML file with the CSS inlined. HTML export of one note takes at most 1 second (FR-28). FR-28.1 and FR-28.3.
2. Export the active note to PDF. Export of one note takes at most 3 seconds (PF-19 in section 7.1). FR-28.1 and FR-28.2.

### Import

`api().vault.open` uses the chosen folder as the vault. The slices below copy files into that vault. Section 7.1 has no import row.

Build import in this order.

1. Copy a Markdown folder into the open vault and leave the source files unchanged. Show the file count before the copy starts. A cancel during that preview leaves the vault unchanged. FR-29.2 and FR-29.6.
2. Import an Obsidian vault and convert its wikilinks. List each dropped construct in the report. FR-29.3.

Notion import (FR-29.4) and Evernote import (FR-29.5) come after these two slices.

### macOS and Linux builds

The `dist` script in `app/package.json` runs `electron-builder --win`. The Windows targets in that file are `nsis` and `portable`. Section 7.1 has no packaging row.

Build the other desktops in this order.

1. Add a macOS DMG target to `dist`. CP-03 in section 7.7 names that DMG. Signing that DMG is part of release automation in Later.
2. Add Linux AppImage, deb, and snap targets to `dist`. CP-03 in section 7.7 names those installers.

## Later

These docs and infra items come after the milestones above.

- Add a root `LICENSE` file that matches the MIT license named in `app/package.json`.
- Add `CONTRIBUTING.md` and the FAQ. Another bot owns both. This list only records them.
- Add release automation that publishes the installers by running `electron-builder` from the `dist` scripts. Issue #8 runs typecheck and the Vite build.

## Shipped

These parts run in the app today.

- Tabs. `App.tsx` keeps open notes in `tabs`. Ctrl+W or Cmd+W closes the active tab.
- Command palette. Ctrl+P or Cmd+P opens `CommandPalette`. Ctrl+O or Cmd+O opens the file list in that palette.
- Daily note. The command `Open daily note` runs `openDaily`. That function opens `YYYY-MM-DD.md` in the vault root and creates that file when it is missing.
- Trash. Choosing Delete in `Explorer` runs `deleteFile`. That function asks for confirmation, then calls `api().fs.trash`. `trashPath` in `app/electron/main.cjs` moves the file to `.locus/trash/` under a `YYYY-MM-DD` folder. The destination name is the original file name.
- Wikilink rewrite. `renameFile` calls `api().fs.rename`. `rewriteLinks` in `app/electron/main.cjs` updates `[[Old]]` and `[[Old|alias]]` to the new base name.
- Outline. The Outline tab in `RightPanel` lists headings from `extractHeadings`. `outlineJump` scrolls the source editor to that heading when the source view is open.
- Backlinks. The Links tab renders `BacklinkList`, which calls `api().search.notes`.
- Explorer. `Explorer` shows the folder tree, a Favorites list, and a Recent list.
- Editor. `cycleMode` switches the active tab between source and reading. In reading mode, `MarkdownView` renders wikilinks, callouts, KaTeX, Mermaid, and task checkboxes. In source mode, `EditorPane` installs the CodeMirror `searchKeymap`.
- Counts. `StatusBar` and the Properties tab use `wordCount` and `readingTimeMinutes`. The Properties tab also lists inline `#` tags from `extractTags`.
- Save. `scheduleSave` writes the note 800 ms after a change. Ctrl+S and the command `Save note` call `requestSave`.
- Vault. `VaultGate` opens a folder or creates one. `api().vault.open` uses that folder as the vault.
- Theme. `toggleTheme` cycles dark, light, and system.

## How this file is kept

The Planner bot updates this file each morning. It files new work as a `locus-bot` issue with acceptance criteria, files likely touched, and a test plan. The labels `priority:high` and `priority:medium` set the pick-up order.
