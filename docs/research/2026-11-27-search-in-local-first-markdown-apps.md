# Search in local-first Markdown apps

This report compares vault search in Obsidian, Omnisearch, Logseq, Zettlr, Joplin, SiYuan, and Typora. It covers how those apps query notes. It covers the forum threads and issues people opened. It says what Locus should take for the faster search index milestone.

Research date: 2026-11-27.

## How competitors search

### Obsidian

Obsidian core search is a sidebar plugin. `Ctrl+Shift+F` opens it on Windows and Linux, and `Command+Shift+F` opens it on macOS. A space means every word must match. `OR` means either word. A leading `-` excludes a word. Quotes mark an exact phrase, as in `"star wars"`. Search is case-insensitive unless Match case is on. These rules are in the [Obsidian search docs](https://obsidian.md/help/plugins/search).

The same docs define `path:`, `file:`, `tag:`, `line:`, and `section:`. `line:(mix flour)` asks for those terms on one line. `section:(dog cat)` asks for those terms in the text between two headings.

The [Obsidian changelog](https://obsidian.md/changelog/) entry for November 12, 2026 adds a Relevance sort that orders notes by the best match for the query. The same entry says search ignores accents, and so do the filters in Backlinks, Outline, and Bookmarks. `cafe` finds `café`. It treats `ø` and `ł` as `o` and `l`. It treats `ß` as `ss`. It also says results appear much faster when a search matches thousands of notes.

### Omnisearch

Omnisearch is an Obsidian community plugin. The [Omnisearch README](https://github.com/scambier/obsidian-omnisearch/blob/master/README.md) says it won the 2023 Gems of the Year award in the Existing plugin category. The README says it uses the MiniSearch library and scores documents with BM25. Relevance depends on how often the query terms appear in the document, in the filename, and in the headings. The README also says the search resists typos, and that quotes and `-` exclusions work.

The [Omnisearch search system page on DeepWiki](https://deepwiki.com/scambier/obsidian-omnisearch/2.2-search-system) describes fuzzy matching whose fuzziness depends on term length. It describes field weights for the filename (`basename`), headings, and tags.

### Logseq

Logseq has repeated changes whose titles are about search index speed.

[Logseq pull request #10924](https://github.com/logseq/logseq/pull/10924) was merged in January 2024. Its title is `fix(mobile): cold start performance of block search`. The pull request says a random graph with 2000+ pages took 60s+ before the change and 8.4s after.

Commit [`d8e7032`](https://github.com/logseq/logseq/commit/d8e7032e78) (March 12, 2026) is titled `fix(search): make index build non-blocking`. Commit [`7edeae6`](https://github.com/logseq/logseq/commit/7edeae6971) (April 15, 2026) is titled `enhance(search): speed up indexing and show progress`.

[Logseq issue #12346](https://github.com/logseq/logseq/issues/12346) (opened January 22, 2026) says the whole app became extremely slow after an update to 0.10.15. A comment by lproven says typing lagged by a second or more. The same comment says search took seconds. The issue itself is general app performance. A later comment by marcosfelt says a fresh Apple Silicon install fixed the slowness, because the updater had installed the x86 build.

### Zettlr

Zettlr global search opens with Cmd or Ctrl+Shift+F. The [Zettlr global search docs](https://docs.zettlr.com/en/file-manager/search.html) say a space is AND, `|` is OR, quotes mark a phrase, and `!` excludes a term. The same page then warns about a two-word query. A file with only one of the words can still appear at a lower score. `!` is a hard exclude.

Results are sorted by relevance and grouped by file. Each match shows a line number and a highlight. A click opens that file on that line.

### Joplin

Joplin indexes note content with SQLite FTS4, and it updates that index in real time. The [Joplin search docs](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md) list filters `title:`, `body:`, `tag:`, `notebook:`, `created:`, `updated:`, `type:`, `resource:`, and `sourceurl:`. `any:1` makes the query OR. A prefix wildcard such as `swim*` matches the start of a word. A leading `/` switches to basic search so special characters match literally.

Joplin sorts notes by relevance. Notes that contain the requested terms the most times come first. For a query with several terms, closeness of those terms also matters.

### SiYuan

SiYuan queries a `blocks` table. `POST /api/query/sql` runs SQL. The example in the [SiYuan API docs](https://github.com/siyuan-note/siyuan/blob/master/docs/API.md) is `SELECT * FROM blocks WHERE content LIKE '%content%' LIMIT 7`.

A query embed is a `NodeBlockQueryEmbed` block. Its script is SQL. The [SiYuan .sy format spec](https://github.com/siyuan-note/siyuan/blob/master/docs/SY-FORMAT.md) shows `select * from blocks where id='...'` inside that block.

The kernel creates one FTS5 virtual table, `blocks_fts`, in [`kernel/sql/database.go`](https://github.com/siyuan-note/siyuan/blob/master/kernel/sql/database.go). The [SiYuan v3.7.0 changelog](https://github.com/siyuan-note/siyuan/blob/master/app/changelogs/v3.7.x/v3.7.0/v3.7.0.md) says SiYuan no longer creates `blocks_fts_case_insensitive`. Case-insensitivity is a tokenizer flag on `blocks_fts`. The flag name is `case_insensitive`, inside `ftsTokenize` in that same Go file.

### Typora

Typora searches the open folder with Mod+Shift+F. The [Typora search guide](https://docs.typora.io/guide/search) says the search can use the file name or the full content, with case-sensitive, whole-word, and regular expression options. A click opens the file at the match.

## What users ask for

The Obsidian forum thread [Improve fuzzy search algorithm for better suggestions](https://forum.obsidian.md/t/improve-fuzzy-search-algorithm-for-better-suggestions/1322) was opened on June 6, 2020, and it is tagged valuable. athul wrote that typing the exact note name while linking did not put that note first. JkNML wrote that `[[` suggestions listed fuzzy matches before the exact file. A maintainer reply on August 24, 2020 said an improved algorithm would be in 0.8.6. The topic was archived on October 13, 2022.

The 2023 thread [Search function improvements](https://forum.obsidian.md/t/search-function-improvements/69584) asks for in-note toggles for highlighting all matches, for case and diacritics, and for whole words. Calliah framed the request as search while looking through one note. The topic was closed automatically on January 15, 2024.

[Typora issue #651](https://github.com/typora/typora-issues/issues/651) was opened on April 19, 2017. It asks to search the contents of every file in the current folder. On January 10, 2019, maintainer abnerlee wrote "supported in new release" and closed the issue. The current Typora guide, linked above, documents that search.

[Logseq issue #12346](https://github.com/logseq/logseq/issues/12346) is the general slowness report described in the Logseq section. It is not a request for a search feature.

## Where Locus stands

`searchNotes` in [`app/electron/main.cjs`](https://github.com/parasraju/locus/blob/main/app/electron/main.cjs) walks `cachedEntries`. It skips folders and non-Markdown files. A `folder` option keeps paths under that prefix. The function tests the query as a JavaScript regular expression. When `regex` is off, it escapes the query and still uses a regular expression. The `i` flag is on unless `caseSensitive` is set. A bad pattern returns an error object instead of throwing.

The loop stops after `MAX_SEARCH_FILES` (5000) Markdown files or `MAX_SEARCH_RESULTS` (200) hits. Hits stay in walk order. Each hit includes a short snippet around the first match. The result has no line number. The file comment above `searchNotes` calls this a placeholder for the SQLite FTS engine in ADR-005.

The Links tab is the only UI caller. `BacklinkList` in [`RightPanel.tsx`](https://github.com/parasraju/locus/blob/main/app/src/components/RightPanel.tsx) calls `api().search.notes` with the open note's name. The [roadmap](https://github.com/parasraju/locus/blob/main/docs/ROADMAP.md) says opening a note makes that call, which is why search is the next milestone. [Issue #4](https://github.com/parasraju/locus/issues/4) adds a sidebar search pane on the same call. The issue text says the pane is UI only, and that a faster index comes later.

[ADR-005 in `PRD.md`](https://github.com/parasraju/locus/blob/main/PRD.md) chooses SQLite FTS5 in app user-data as a rebuildable cache, plus a separate filename index for the quick switcher. The [roadmap](https://github.com/parasraju/locus/blob/main/docs/ROADMAP.md) builds that index in this order, and it places boolean queries after these slices.

1. Build the full-text index when a vault opens. Update it from `startWatcher` when one file changes. A full re-index of 100k notes takes at most 8 seconds. One file takes at most 500 ms.
2. Make `searchNotes` read that index. A full-text query over 100k notes takes at most 150 ms.
3. Answer Ctrl+O filename queries in `CommandPalette` from the filename index. A match takes at most 50 ms.

Those three slices are the right first cut. The [Joplin search docs](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md) and [SiYuan `database.go`](https://github.com/siyuan-note/siyuan/blob/master/kernel/sql/database.go) already answer from an FTS table. The November 12, 2026 [Obsidian changelog](https://obsidian.md/changelog/) adds a Relevance sort and accent folding. [Logseq pull request #10924](https://github.com/logseq/logseq/pull/10924) is about cold start. Commit [`d8e7032`](https://github.com/logseq/logseq/commit/d8e7032e78) is about a build that does not block. Commit [`7edeae6`](https://github.com/logseq/logseq/commit/7edeae6971) is about faster indexing and visible progress. Locus should copy that discipline inside slice 1. Ranking and operators should wait until `searchNotes` reads the index.

The current cap is easy to miss. A full list of 200 hits and a list cut off at 200 hits are both arrays. The function also stops after 5000 Markdown files. That shorter array looks complete too. [Issue #4](https://github.com/parasraju/locus/issues/4) shows the snippet from `searchNotes`. The issue does not ask the pane to say the walk stopped. Slice 2 should rank hits, so the 200 it returns are the strongest matches. Today the walk keeps matches in `cachedEntries` order and stops at 200.

`wikilinkCompletions` in [`EditorPane.tsx`](https://github.com/parasraju/locus/blob/main/app/src/components/EditorPane.tsx) keeps paths that contain the typed text. It keeps vault order, and it stops at 50. Exact base names stay where that list put them. That is the gap in the 2020 thread [Improve fuzzy search algorithm for better suggestions](https://forum.obsidian.md/t/improve-fuzzy-search-algorithm-for-better-suggestions/1322), which is about `[[` suggestions. The thread later recorded a planned fix in Obsidian 0.8.6. Locus still has the gap.

`fuzzyScore` in [`CommandPalette.tsx`](https://github.com/parasraju/locus/blob/main/app/src/components/CommandPalette.tsx) gives a substring hit `100` minus the match index. Two titles that both start with the query tie. There is no extra bonus when the query equals the base name. Ctrl+O filters the in-memory file list. Slice 3 is what moves that query onto a filename index. Exact-name ordering can land before that index.

A case-insensitive JavaScript regular expression does not treat `cafe` and `café` as the same string. The November 12, 2026 [Obsidian changelog](https://obsidian.md/changelog/) does, in search and in Backlinks, Outline, and Bookmarks. The fold belongs in the index tokenizer on slice 1, so slice 2 can use it. A fold only in the current regex walk would disappear when slice 2 replaces that walk.

FR-08.3, FR-08.4, and FR-08.5 in [`PRD.md`](https://github.com/parasraju/locus/blob/main/PRD.md) already ask for boolean operators, quoted phrases, and `tag:`, `file:`, `path:`, and `title:`. ADR-005 says boolean, phrase, prefix, and `-` NOT map to FR-08.3, and it picks FTS5 as the engine. The [roadmap](https://github.com/parasraju/locus/blob/main/docs/ROADMAP.md) holds this work until the three index slices are done. That gate is right. SiYuan exposes SQL in query embed blocks and on `POST /api/query/sql`. Those queries read the `blocks` table. Locus notes are Markdown files. The search box should grow the operator set in the Obsidian and Joplin docs linked above. Raw SQL should stay out of that box.

The 2023 Obsidian thread is about in-note find. The search milestone is the vault index. `EditorPane` installs the CodeMirror `searchKeymap`. That in-note request can wait behind the milestone.

## Suggested issues for the Planner

These are ideas for the Planner to file. They are not GitHub issues yet. None of them repeats [issue #4](https://github.com/parasraju/locus/issues/4) or the three index slices in the [roadmap](https://github.com/parasraju/locus/blob/main/docs/ROADMAP.md).

### Show index progress and keep the app responsive

Roadmap slice 1 builds the full-text index on vault open and updates it from `startWatcher`. This issue adds the part that slice does not name. Keep the app responsive while the index builds, and show progress in the status bar. Leave the index format to slice 1. Leave the 8 second and 500 ms budgets as they are. [Logseq pull request #10924](https://github.com/logseq/logseq/pull/10924) reports cold start of block search at 60s+ before the change and 8.4s after, on a graph of 2000+ pages. Commit [`d8e7032`](https://github.com/logseq/logseq/commit/d8e7032e78) is titled `fix(search): make index build non-blocking`. Commit [`7edeae6`](https://github.com/logseq/logseq/commit/7edeae6971) is titled `enhance(search): speed up indexing and show progress`. [Logseq issue #12346](https://github.com/logseq/logseq/issues/12346) is a warning that the whole app, including typing, felt slow on 0.10.15. That issue is general performance. A comment traced some Mac cases to an x86 binary. The commits above are the part to copy.

### Open a vault search hit on the matching line

`searchNotes` returns a snippet and no line. Issue #4 opens the note. Add a line or character offset on each hit, and scroll the editor there when the result is clicked. This depends on issue #4 and does not replace it. The [Zettlr global search docs](https://docs.zettlr.com/en/file-manager/search.html) and the [Typora search guide](https://docs.typora.io/guide/search) both open the file at the match.

### Rank full-text hits after searchNotes reads the index

Roadmap slice 2 makes `searchNotes` read the FTS index. This issue only sets the order of those hits. Rank by how often the terms appear and how close they are, and boost the title and headings. Leave the index build in slice 1. FR-08.11 in [`PRD.md`](https://github.com/parasraju/locus/blob/main/PRD.md) also asks for link-degree and recency. Put those weights in the same score function. The Relevance sort in the November 12, 2026 [Obsidian changelog](https://obsidian.md/changelog/) is one reason. BM25, plus filename and heading weights, is in the [Omnisearch README](https://github.com/scambier/obsidian-omnisearch/blob/master/README.md). Tag weights are on the [DeepWiki search system page](https://deepwiki.com/scambier/obsidian-omnisearch/2.2-search-system). Joplin's order is in the [Joplin search docs](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md).

### Fold accents in the full-text index

On roadmap slice 1, store a folded form of the text. `cafe` should match `café`. `ø` and `ł` should match `o` and `l`. `ß` should match `ss`. Apply the same fold to the query when slice 2 runs. Do not add a second search mode. The fold list is the November 12, 2026 entry in the [Obsidian changelog](https://obsidian.md/changelog/). Today's `searchNotes` regular expression does not fold these letters.

### Add phrase, exclusion, and field operators after the index slices

The roadmap already says boolean queries come after the three index slices. This issue is that next slice. Keep the parser small. Support quoted phrases, exclusion with `-`, and the operators `path:`, `file:`, and `tag:`. Leave saved searches (FR-08.8) for a later issue. `OR` and `title:` stay written in FR-08.3 and FR-08.5 and can follow this slice. The operators are in the [Obsidian search docs](https://obsidian.md/help/plugins/search). The filters are in the [Joplin search docs](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md). Phrase and exclusion syntax is in the [Zettlr global search docs](https://docs.zettlr.com/en/file-manager/search.html).

### Put exact wikilink matches first

`wikilinkCompletions` lists the first 50 paths that contain the typed text, in vault order. Sort an exact base-name match above a partial match, and apply the same tie-break in `CommandPalette` file mode. This does not replace roadmap slice 3, which is the filename index and the 50 ms budget. The motivation is the 2020 thread [Improve fuzzy search algorithm for better suggestions](https://forum.obsidian.md/t/improve-fuzzy-search-algorithm-for-better-suggestions/1322).

## Sources

Every URL used above is listed here.

- [Obsidian search docs](https://obsidian.md/help/plugins/search)
- [Obsidian changelog](https://obsidian.md/changelog/)
- [Obsidian forum: Improve fuzzy search algorithm for better suggestions](https://forum.obsidian.md/t/improve-fuzzy-search-algorithm-for-better-suggestions/1322)
- [Obsidian forum: Search function improvements](https://forum.obsidian.md/t/search-function-improvements/69584)
- [Omnisearch README](https://github.com/scambier/obsidian-omnisearch/blob/master/README.md)
- [Omnisearch search system on DeepWiki](https://deepwiki.com/scambier/obsidian-omnisearch/2.2-search-system)
- [Logseq pull request #10924](https://github.com/logseq/logseq/pull/10924)
- [Logseq commit d8e7032](https://github.com/logseq/logseq/commit/d8e7032e78)
- [Logseq commit 7edeae6](https://github.com/logseq/logseq/commit/7edeae6971)
- [Logseq issue #12346](https://github.com/logseq/logseq/issues/12346)
- [Zettlr global search docs](https://docs.zettlr.com/en/file-manager/search.html)
- [Joplin search docs](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md)
- [SiYuan API docs](https://github.com/siyuan-note/siyuan/blob/master/docs/API.md)
- [SiYuan .sy format spec](https://github.com/siyuan-note/siyuan/blob/master/docs/SY-FORMAT.md)
- [SiYuan kernel/sql/database.go](https://github.com/siyuan-note/siyuan/blob/master/kernel/sql/database.go)
- [SiYuan v3.7.0 changelog](https://github.com/siyuan-note/siyuan/blob/master/app/changelogs/v3.7.x/v3.7.0/v3.7.0.md)
- [Typora search guide](https://docs.typora.io/guide/search)
- [Typora issue #651](https://github.com/typora/typora-issues/issues/651)
- [Locus app/electron/main.cjs](https://github.com/parasraju/locus/blob/main/app/electron/main.cjs)
- [Locus RightPanel.tsx](https://github.com/parasraju/locus/blob/main/app/src/components/RightPanel.tsx)
- [Locus EditorPane.tsx](https://github.com/parasraju/locus/blob/main/app/src/components/EditorPane.tsx)
- [Locus CommandPalette.tsx](https://github.com/parasraju/locus/blob/main/app/src/components/CommandPalette.tsx)
- [Locus docs/ROADMAP.md](https://github.com/parasraju/locus/blob/main/docs/ROADMAP.md)
- [Locus PRD.md](https://github.com/parasraju/locus/blob/main/PRD.md)
- [Locus issue #4](https://github.com/parasraju/locus/issues/4)
