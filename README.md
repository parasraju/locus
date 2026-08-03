<div align="center">

  <pre>
  __                          __
 / /   _____  ____  ____  ___/ /__  _____
/ / | / / _ \/ __ \/ __ \/ _  / _ \/ ___/
/ /___/ /  __/ / / / / / /  __/  __/ /
\____/_/\___/_/ /_/_/ /_/\__,_/\___/_/
  </pre>

  **A calm, local-first Markdown knowledge workspace for your desktop**

  Notes are plain `.md` files on your disk — no database, no lock-in, no cloud.
  Write in Markdown with live preview, wikilinks, callouts, math, Mermaid
  diagrams, and a keyboard-first workflow.

  [![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
  [![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D70000?logo=codemirror&logoColor=white)](https://codemirror.net)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

  <a href="#features"><img src="https://img.shields.io/badge/%E2%9C%A8-Features-7c3aed?style=for-the-badge"></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/%E2%9A%A1-Quick%20Start-2563eb?style=for-the-badge"></a>
  <a href="#keyboard-shortcuts"><img src="https://img.shields.io/badge/%F0%9F%8E%B9-Shortcuts-0d9488?style=for-the-badge"></a>
  <a href="#project-structure"><img src="https://img.shields.io/badge/%F0%9F%8F%97-Structure-475569?style=for-the-badge"></a>
  <a href="#roadmap"><img src="https://img.shields.io/badge/%F0%9F%97%BA-Roadmap-c026d3?style=for-the-badge"></a>

</div>

---

## Features

- **Plain Markdown on disk** — every note is a real `.md` file. Use it with any editor, sync it with anything, leave anytime.
- **Live preview** — source, split, and reading modes; cycle with `Ctrl+E`.
- **Rich Markdown** — GFM, wikilinks `[[Note]]`, callouts, footnotes, tables, task lists, KaTeX math, and Mermaid diagrams.
- **Floating toolbar** — formatting (H1–H3, bold, italic, code, link, table, lists, quotes, dividers, images) that appears on hover and stays out of your way while typing.
- **Command palette** — `Ctrl+P` for commands, `/` to jump straight to notes.
- **Sidebar** — collapsible folder tree, favorites, recent notes, and vault filter.
- **Right panel** — outline, backlinks, and per-note properties (tags, word count, reading time).
- **Dark glass UI** — calm matte design with soft shadows and smooth 150–200ms animations.
- **Keyboard-first** — everything you need is reachable without the mouse.
- **Local & private** — nothing leaves your machine. No account, no telemetry.

## Quick Start

```powershell
cd app
npm install

# Run the desktop app (dev)
npm run dev:electron
```

For a production build:

```powershell
npm run build
npm start
```

Open (or create) a folder as a vault — that folder *is* your notes library.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New note |
| `Ctrl+O` / `Ctrl+P` | Open note / command palette |
| `Ctrl+S` | Save note |
| `Ctrl+E` | Cycle editor mode (source → split → reading) |
| `Ctrl+J` | Open daily note |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+S` | Toggle sidebar |
| `Ctrl+Shift+E` | Toggle right panel |
| `Ctrl+Shift+L` | Toggle theme |

## Project Structure

```
Locus/
├── app/                     # Electron + React app
│   ├── electron/            # Main process (IPC, file safety, CSP, watcher)
│   ├── src/
│   │   ├── components/      # Explorer, editor, toolbar, panels, palette
│   │   ├── lib/             # Markdown pipeline, formatting actions
│   │   └── styles.css       # Tailwind v4 design tokens
│   └── scripts/             # Dev launcher
├── PRD.md                   # Full product requirements & acceptance criteria
└── designmd.md              # UI design system
```

## Roadmap

See the full backlog in [`PRD.md`](PRD.md) — priorities include mobile support, sync adapters, and the full AI assistant.

## License

MIT
