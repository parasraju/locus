# Startup and large-vault performance benchmarks

This report covers how Obsidian, Logseq, Zettlr, and Joplin measure startup time, large-vault load, and typing latency. It quotes the numbers those projects published. It proposes targets and a benchmark method for Locus.

Research date: 2026-11-28.

The [2026-11-27 search report](https://github.com/parasraju/locus/blob/main/docs/research/2026-11-27-search-in-local-first-markdown-apps.md) covers query syntax and the search index. This report does not repeat that.

## What competitors measure

### Obsidian

Obsidian prints a startup breakdown. The lines are total startup time, initialization, vault (with a file count), workspace (tab count and how many tabs are deferred), and core plugins. When community plugins are on, the breakdown adds a community-plugin total and a time for each plugin.

The [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/) uses that breakdown on a fixed vault. The vault is the [10000-markdown-files](https://github.com/Zettelkasten-Method/10000-markdown-files) repository. Every file is Markdown. There are no attachments. The post states Arch Linux, Gnome 49, a SATA SSD, the AUR package, and Obsidian 1.12.2. The post says the AppImage and the Flatpak are slower. The published times are for the AUR package.

The post varies three things. FLAT puts every file in the vault root, without the readme. FOLDERS builds 20 folders, each with 5 folders, each of those with 5 folders, and every folder holds at least one Markdown file. UNLINKED leaves the notes as they are. LINKED adds 5 random wikilinks to each note. ALL PLUGINS uses the default plugins of a new vault and no community plugins. NO PLUGINS turns off every core plugin.

The post reports the 5th open after closing and reopening the app on that vault. The author sets aside the first open and calls that first open a slow start.

The forum thread [How many notes do you have?](https://forum.obsidian.md/t/how-many-notes-do-you-have/36987) quotes a dev stress test. joethei writes that the devs stress-tested Obsidian with 20k notes. The quoted note says the files come from the same repository. The quote says the vault "works okay on a relatively fast desktop computer" and that "the initial loading and processing could take some time for sure." The repository description says "10,000 markdown files." The speed test reports a vault of 10,000 files from that repository.

The thread [Performance on large vaults](https://forum.obsidian.md/t/performance-on-large-vaults/114864) pastes the same breakdown on Windows 11. The opening post counts 993 notes and says less than 200 are images. WhiteNoise replies, "I would not call this a large vault."

### Logseq

[Logseq issue #11236](https://github.com/logseq/logseq/issues/11236) is a startup failure on a large graph. The report says the app fails to launch when the graph passes 300MB. The graph has over 30,000 files. A later comment counts 69,581 pages and tens of thousands of asset files.

andelf writes, "Currently, Logseq loads all data into memory as a datascript DB." That sentence names the load the project treats as the cause.

[Logseq pull request #11774](https://github.com/logseq/logseq/pull/11774) measures app start on an exported sqlite file called "4k movies". It compares the branch with `feat/db`. The body also times opening "All pages", opening "#movies", command search, and table scrolling. The change loads less data into the UI database and moves view work to a worker.

[Logseq pull request #10933](https://github.com/logseq/logseq/pull/10933) is the earlier change that loads only the data the UI needs. The body points at a demo with 30k pages. Review comments state the times.

### Zettlr

[Zettlr issue #435](https://github.com/Zettlr/Zettlr/issues/435) measures typing delay against line length. The tester uses key repeat and records the delay per character. The measured editor path is CodeMirror 5. The same tester confirms the delay on the CodeMirror 5 demo. The CodeMirror 6 demo edits extremely long lines without that delay.

[Zettlr issue #4604](https://github.com/Zettlr/Zettlr/issues/4604) measures typing on one large Markdown file. The file has 14k+ words. The app is Zettlr 3.0.0 on Windows 10. The maintainer profiles the document and names the parsers that dominate the profile. On 2025-10-01 the maintainer closes the issue and writes that the file "works butter smooth" on the current dev branch.

### Joplin

[Joplin issue #9115](https://github.com/laurent22/joplin/issues/9115) compares the CodeMirror 5 editor with the CodeMirror 6 beta editor on a very long note. Joplin version is 2.13.2 on Ubuntu 23.10. The test is a log line above the editor update. The issue counts how often that line runs per keystroke.

## Reported numbers

| Case | Number as published | Source |
| --- | --- | --- |
| Flat vault, 10,000 files, no added links, default plugins, 5th open | Total startup time 1,090ms. Vault 752ms. | [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/) |
| Flat vault, 10,000 files, 5 wikilinks per note, default plugins, 5th open | Total startup time 1,600ms. Vault 1,220ms. | [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/) |
| Windows 11, 999 files, 9 community plugins | Total startup time 2,016ms. Vault 233ms. Community plugins 278ms. | [Performance on large vaults](https://forum.obsidian.md/t/performance-on-large-vaults/114864) |
| Windows 11, 1,009 files, 8 community plugins | Total startup time 10,317ms. Vault 3,806ms. Community plugins 4,247ms. | [Performance on large vaults](https://forum.obsidian.md/t/performance-on-large-vaults/114864) |
| Dev stress test, 20k Markdown files | "works okay" on a relatively fast desktop. Initial load "could take some time for sure." | [How many notes do you have?](https://forum.obsidian.md/t/how-many-notes-do-you-have/36987) |
| Graph larger than 300MB | The app fails to launch. A follow-up counts 69,581 pages. | [Logseq issue #11236](https://github.com/logseq/logseq/issues/11236) |
| 4k movies sqlite, compared with `feat/db` | App start from 20s to 1 ~ 2s. `feat/db` loads 784571 datoms in 20077 ms. This pull request loads 2880 datoms in 945 ms. | [Logseq pull request #11774](https://github.com/logseq/logseq/pull/11774) |
| 30k pages with 20 blocks | A reviewer reports load in ~600ms. | [Logseq pull request #10933](https://github.com/logseq/logseq/pull/10933) |
| CodeMirror 5, one line of ~500 characters | Delays become noticeable at tens of milliseconds per character. | [Zettlr issue #435](https://github.com/Zettlr/Zettlr/issues/435) |
| CodeMirror 5, one line of 5000 characters | Delay is over a second per character. | [Zettlr issue #435](https://github.com/Zettlr/Zettlr/issues/435) |
| Zettlr 3.0.0, one file of 14k+ words, Windows 10 | Newly typed text often takes several seconds to appear. | [Zettlr issue #4604](https://github.com/Zettlr/Zettlr/issues/4604) |
| Joplin 2.13.2, CodeMirror 6 beta, very long note | The log line runs three or more times per keystroke. CodeMirror 5 runs it once per keystroke, and with a delay. | [Joplin issue #9115](https://github.com/laurent22/joplin/issues/9115) |

The speed test also lists the other layouts. With plugins off, the flat unlinked vault totals 1,034ms and the vault line is 744ms. With plugins off, the flat linked vault totals 1,186ms and the vault line is 881ms. The folder layout, unlinked, default plugins, totals 1,220ms and the vault line is 845ms. The folder layout, linked, default plugins, totals 1,358ms and the vault line is 979ms. With plugins off, the folder layout totals 1,081ms unlinked (vault 811ms) and 1,205ms linked (vault 916ms).

The 10,317ms Windows run is on a vault the author later says is synced with OneDrive. In that run, Better Markdown Links accounts for 1,026ms of the community-plugin time. On the 2,016ms run, initialization is 1,260ms and the vault line is 233ms.

The pull request #11774 body also says open "All pages" goes from 4s to 400ms, and open "#movies" goes from 5s to 400ms. The body says command search goes from 3~4s to less than 100ms. The body says table scrolling keeps a minimum frame rate of >40 fps. The body says the `feat/db` path drops frames to 1 fps. A comment on that pull request says start time on the author's PC goes from 16 ~ 18s to 2 ~ 3s, and that the change avoids loading all pages (~ 200k datoms) into the memory database. A reviewer then sees `restore-graph! loads 1187104 datoms in 16621 ms`. The author says a later commit fixes that reading. The body start time, the comment start time, and the reviewer log are three different readings.

On pull request #10933, a reviewer also reports subsecond load times on a graph with 50k pages. The same review lists three graphs before and after. `work/docs` goes from 2447 ms (76492 datoms) to 1153 ms. `logseq-notes` goes from 2730 ms (134855 datoms) to 2280ms. `durm` goes from 632 ms (38572 datoms) to 1646 ms. A later comment says `durm` then improves to around 150ms.

In Zettlr issue #435 the delay increases linearly with line length. At ~1000 characters the delay trips up typing. At 50k characters the delay is 17 seconds per character. The comment says the CodeMirror 6 demo edits extremely long lines without that delay.

## What makes them slow

Logseq loads the whole graph into an in-memory datascript database. andelf names that load as the root cause on large graphs. Issue #11236 shows the result. A graph past 300MB fails to launch. Pull request #11774 states the change it ships. The change loads only the data the UI needs. It skips the full page load into the UI database at start. It moves almost all view work to a worker. Custom queries stay for a later pull request. Pull request #10933 is the earlier step. It delays loading pages at start and builds the transaction data in a worker.

Zettlr issue #435 is per-character work that grows with the length of the line. That work shows up on CodeMirror 5. The CodeMirror 6 demo edits the same kind of line without it. Zettlr issue #4604 is a second pattern. Three parsers (plain text, math, and footnote) run heavy regular expressions on every line. They ignore the `next` parameter they are given. In the 2023 comments, after those parsers improve, the table of contents calls `ensureSyntaxTree` so the whole syntax tree is parsed. The 2025 close says the file works butter smooth on the current dev branch. Joplin issue #9115 shows repeated work on each keystroke in a CodeMirror 6 editor. The beta editor runs its logged update three or more times on each keystroke. The CodeMirror 5 editor runs it once.

Links and plugins also move Obsidian startup time. The speed test shows 5 wikilinks per note raising the flat default-plugin total from 1,090ms to 1,600ms. Community plugins take 4,247ms of the 10,317ms startup. The author later says that vault is synced with OneDrive. In that thread, cheezopath writes that Dataview can chew up to the memory limit. jpfieber writes of over 23,000 journals that things generally work well, and that Dataview can "bring Obsidian to it's knees."

## Where Locus stands

Locus edits notes with CodeMirror 6. [ADR-003 in `PRD.md`](https://github.com/parasraju/locus/blob/main/PRD.md) chooses CodeMirror 6. [`EditorPane.tsx`](https://github.com/parasraju/locus/blob/main/app/src/components/EditorPane.tsx) builds an `EditorView` from `@codemirror/view` and turns on `@codemirror/lang-markdown`. [`app/package.json`](https://github.com/parasraju/locus/blob/main/app/package.json) depends on `@codemirror/view` `^6.36.2`. The lockfile resolves `@codemirror/view` to 6.43.7. The long-line delay in Zettlr issue #435 is a CodeMirror 5 result.

`EditorPane` waits 250 ms after a change before it calls `onChange`. That timer is the save publish. It is separate from the paint of the typed character. In split mode and reading mode, `MarkdownView` receives the full note string and renders it with `react-markdown`.

`walkVault` in [`app/electron/main.cjs`](https://github.com/parasraju/locus/blob/main/app/electron/main.cjs) stores path, size, and mtime. `readNote` reads a body on demand and keeps an LRU cache of 500 notes (`CONTENT_CACHE_LIMIT`). The app prints no split of startup time.

Section 7.1 of [`PRD.md`](https://github.com/parasraju/locus/blob/main/PRD.md) already sets budgets. Cold start to an interactive editor is at most 1.2 s (PF-01). Warm start while the app stays resident is at most 300 ms (PF-02). Typing latency is at most 50 ms at P99 (PF-05). A full re-index of 100k notes is at most 8 s (PF-08). Idle memory on an empty vault is at most 400 MB (PF-21). The reference machine is an Intel i5-12400, 16 GB RAM, an NVMe SSD, and Windows 11.

## Proposed targets

These targets are proposals for a public benchmark. They do not add rows to section 7.1.

- Cold start to a usable editor on the unlinked 10,000-file corpus stays at most 1.2 s on the reference machine. That applies PF-01 to this corpus.
- The 5th quit-and-reopen of that unlinked corpus stays at most 1,090 ms total, and the vault portion stays at most 752 ms. Those are the flat default-plugin numbers in the speed test. PF-03 covers a vault switch of 100k notes, at most 800 ms.
- The 5th run of the linked copy (5 wikilinks per note) stays at most 1,600 ms total, and the vault portion stays at most 1,220 ms. Those are the flat linked default-plugin numbers in the speed test.
- A full index build of the 10,000-file corpus finishes in at most 1 s. PF-08 remains 8 s for 100k notes. The 1 s figure applies only to this corpus.
- One fixed search query on this corpus returns in at most 150 ms. PF-06 is 150 ms on 100k notes. Using 150 ms here is a proposal for the public run.
- Keystroke-to-paint stays at most 50 ms at P99 on a line of 5000 characters and on a note of 14k+ words. The 50 ms figure is PF-05. The two fixtures are the proposal.
- A reload of the open vault, with the process still running, stays at most 300 ms. That is PF-02. The benchmark records it beside the 5th launch so the two numbers stay distinct.
- RSS after opening the 10,000-file corpus, with one note open, stays at most 400 MB. PF-21 is the empty-vault cap. Applying it to this corpus is a proposal.

## Benchmark method

The method follows the Obsidian speed test. It uses one public corpus. It states the machine. It reports the 5th run and the median of the 5 runs.

1. Clone [10000-markdown-files](https://github.com/Zettelkasten-Method/10000-markdown-files). Use that tree as the unlinked vault. Match the FLAT setup in the speed test. That setup removes the readme and leaves the Markdown files in the vault root.
2. Copy the tree. Add 5 wikilinks to each note. Use a fixed seed and check the seed into the script. Keep this copy as the linked vault.
3. Add two fixture notes beside the corpus. One note is a single line of 5000 characters. One note has 14k+ words.
4. Write the machine into the result. Name the CPU, RAM, disk type, OS and version, Locus version, Electron version, and whether another app syncs the vault folder. Section 7.1 names the reference machine. A run on another machine stays valid when these fields are filled in.
5. Cold start. Reboot, or drop the OS file cache, then launch Locus on the unlinked vault. Record the time from process start until the editor shows the first note. Split that time into initialization, vault walk, workspace restore, and plugin load.
6. Quit and reopen the same vault four more times. Publish the 5th run. Also publish the median of the 5 totals. Do the same pair of numbers for the linked vault.
7. With the process still open, reload the vault and record that time against the warm-start proposal.
8. Record index-build time on each open. Keep it separate from first paint.
9. Run one search query. The query string lives in the script. Record the time until results appear. Leave the search engine unchanged in this run.
10. Focus the 5000-character line. Type one character at the end. Record the time until that character is painted. Repeat on the 14k+ word note in source mode, then in split mode. In split mode, record editor paint and preview update as two numbers. Leave the 250 ms save timer out of the paint number.
11. Record RSS after the cold open with one note on screen, and again after the typing steps.
12. Write the result as a Markdown table. Each row names the metric, the 5th run, the median, the vault (unlinked or linked), and the machine line from step 4.

## Suggested issues for the Planner

These are ideas for the Planner to file. They are not GitHub issues yet.

### Add a startup timing breakdown

Print four times when a vault finishes opening. The times are initialization, vault walk, workspace restore, and plugin load. A log line or a dev command is enough. Leave `walkVault` as it is. Obsidian already prints this split. The [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/) and [Performance on large vaults](https://forum.obsidian.md/t/performance-on-large-vaults/114864) both paste it.

### Add a benchmark script for the 10,000-file corpus

Clone [10000-markdown-files](https://github.com/Zettelkasten-Method/10000-markdown-files). Open it cold, then four more times. Write the 5th run and the median of the 5 runs. Record startup, index build, one fixed search query, and RSS. The result states CPU, RAM, disk, OS, and Locus version. Leave the search engine alone. The query string stays in the script.

### Measure keystroke-to-paint on a line of 5000 characters

Build a fixture that is one line of 5000 characters. Type one character at the end of the line in the CodeMirror 6 `EditorView`. Record the time until the character is painted. Keep the 250 ms save timer in `EditorPane` out of that number. The bar is PF-05, 50 ms at P99. [Zettlr issue #435](https://github.com/Zettlr/Zettlr/issues/435) is the reason for this fixture. The CodeMirror 6 demo edits extremely long lines without that CodeMirror 5 delay. This test checks the 5000-character line in Locus against PF-05.

### Measure typing on a note of 14k+ words

Build a Markdown fixture of 14k+ words. Run the same paint timing in source mode and in split mode. In split mode, time the editor paint and the `MarkdownView` update as separate numbers. `MarkdownView` renders the full string. [Zettlr issue #4604](https://github.com/Zettlr/Zettlr/issues/4604) is the reason. Leave table-of-contents work out of this issue.

### Benchmark the corpus with 5 wikilinks per note

Extend the benchmark script. Copy the corpus and add 5 wikilinks per note with a fixed seed. Run the same startup timing on that copy. Publish the unlinked and linked results side by side. The [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/) is the pattern. On the flat default-plugin runs, the total moves from 1,090ms to 1,600ms when those links are present.

### Guard startup against reading every note body

`walkVault` stores path, size, and mtime. `readNote` reads a body on demand into a cache of 500 notes. Add a test that opening the 10,000-file corpus does not read every note body. Record RSS in the benchmark script. [Logseq issue #11236](https://github.com/logseq/logseq/issues/11236) is the failure this test guards against. [Logseq pull request #11774](https://github.com/logseq/logseq/pull/11774) is the change that project shipped. This issue leaves [issue #3](https://github.com/parasraju/locus/issues/3) as it is. That issue is about a save that re-walks the vault.

## Sources

Every URL used above is listed here.

- [Obsidian speed test](https://www.reddit.com/r/ObsidianMD/comments/1rbjhox/obsidian_speed_test/)
- [How many notes do you have?](https://forum.obsidian.md/t/how-many-notes-do-you-have/36987)
- [Performance on large vaults](https://forum.obsidian.md/t/performance-on-large-vaults/114864)
- [10000-markdown-files](https://github.com/Zettelkasten-Method/10000-markdown-files)
- [Logseq issue #11236](https://github.com/logseq/logseq/issues/11236)
- [Logseq pull request #11774](https://github.com/logseq/logseq/pull/11774)
- [Logseq pull request #10933](https://github.com/logseq/logseq/pull/10933)
- [Zettlr issue #435](https://github.com/Zettlr/Zettlr/issues/435)
- [Zettlr issue #4604](https://github.com/Zettlr/Zettlr/issues/4604)
- [Joplin issue #9115](https://github.com/laurent22/joplin/issues/9115)
- [Locus PRD.md](https://github.com/parasraju/locus/blob/main/PRD.md)
- [Locus EditorPane.tsx](https://github.com/parasraju/locus/blob/main/app/src/components/EditorPane.tsx)
- [Locus app/package.json](https://github.com/parasraju/locus/blob/main/app/package.json)
- [Locus app/electron/main.cjs](https://github.com/parasraju/locus/blob/main/app/electron/main.cjs)
- [Locus issue #3](https://github.com/parasraju/locus/issues/3)
- [2026-11-27 search report](https://github.com/parasraju/locus/blob/main/docs/research/2026-11-27-search-in-local-first-markdown-apps.md)
