# Aurelius

> Notes with superpowers. The best of Notion, Tana, and Obsidian in one local-first app.

## Stack

- **Electron** — Desktop shell
- **React + Vite + TypeScript** — Renderer
- **BlockNote** — Block-based Markdown editor
- **D3.js** — Graph view
- **Zustand** — State management
- **gray-matter** — Frontmatter parsing
- **Local .md files** — All data stored in your vault folder

## Architecture

```
Every note = a node = a .md file with frontmatter:

---
id: "uuid"
title: "Node Title"  
created: "ISO date"
updated: "ISO date"
links: ["linked-node-uuid", ...]
---

Content in pure Markdown here.
[[Other Node]] creates a wiki link that resolves to the node's UUID internally.
```

## Getting Started

```bash
npm install
npm run dev
```

On first launch, choose a vault folder. All your nodes will be stored there as `.md` files readable in any editor.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘G` | Toggle graph view |
| `⌘N` | New node |
| `⌘[` | Navigate back |
| `/` | Block type menu |
| `[[` | Link to another node |

## Features (MVP)

- [x] Block-based Markdown editor (BlockNote)
- [x] Local vault storage (.md files with frontmatter)
- [x] Node navigation with breadcrumb drill-down
- [x] Sidebar with node list + search
- [x] Backlinks panel
- [x] D3 force-directed graph view
- [x] Wiki-style `[[links]]` between nodes
- [x] Auto-save with debounce
- [ ] Block-level drill-down (zoom into sub-blocks)
- [ ] `[[link]]` autocomplete
- [ ] Tag system
- [ ] Full-text search
