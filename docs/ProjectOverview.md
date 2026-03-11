Aurelius — Resumen de Proyecto
Concepto
App de escritorio para tomar notas que combina lo mejor de tres herramientas:
	∙	Notion — bloques: cada línea/elemento es su propio objeto
	∙	Tana — navegación por nodos: click en un bloque hace drill-down (zoom-in) a ese bloque como nodo propio, con breadcrumb
	∙	Obsidian — infraestructura local: todo se guarda como archivos .md en una carpeta (vault)
El usuario escribe en Markdown puro. Los nodos se conectan con [[wiki links]]. Todo vive en disco, legible en cualquier editor.

Stack decidido
	∙	Electron — app de escritorio
	∙	React + Vite + TypeScript — renderer
	∙	BlockNote — editor de bloques (base, nos ahorra construir el editor desde cero)
	∙	D3.js — vista de grafo
	∙	Zustand — estado global
	∙	gray-matter — parseo de frontmatter YAML
	∙	Almacenamiento: archivos .md locales con frontmatter

Modelo de datos
Cada nodo es un archivo .md:

---
id: "uuid"
title: "Título del nodo"
created: "ISO date"
updated: "ISO date"
links: ["uuid-de-nodo-linked", ...]
---

Contenido en Markdown puro.
[[Otro Nodo]] crea un link que se resuelve a UUID internamente.


Lo que está construido (v0.1)
19 archivos, proyecto funcional listo para npm install && npm run dev:



|Archivo                  |Qué hace                                                                    |
|-------------------------|----------------------------------------------------------------------------|
|`electron/main.cjs`      |Main process, IPC handlers, filesystem (leer/escribir/borrar .md)           |
|`electron/preload.cjs`   |Bridge seguro Electron ↔ React via contextBridge                            |
|`src/lib/parser.ts`      |Parseo frontmatter, extracción de wiki links, backlinks index, serialización|
|`src/store/index.ts`     |Estado global: vault, nodos, navigation stack, auto-save                    |
|`src/components/Editor/` |BlockNote con tema dark, edición de título inline, auto-save 800ms debounce |
|`src/components/Graph/`  |D3 force-directed graph: zoom, pan, drag, glow en nodo activo               |
|`src/components/Sidebar/`|Lista de nodos, búsqueda, backlinks panel, welcome screen                   |
|`src/styles/`            |Tema completo dark (IBM Plex Mono + Syne, acento #7c6af7, base #0d0d0f)     |

Lo que falta (backlog en orden de prioridad)
	1.	Block drill-down — El feature core. Click en un bloque hace zoom-in a ese bloque específico como nodo propio. Es lo que diferencia a Aurelius de cualquier otro editor Markdown. Técnicamente requiere asignar UUIDs a bloques individuales dentro del archivo y manejar la navegación parent→child.
	2.	[[link]] autocomplete — Al escribir [[ debe aparecer un menú con nodos existentes. Si escribes un nombre que no existe, crea el nodo al confirmar.
	3.	Keyboard shortcuts — ⌘N nuevo nodo, ⌘[ navegar atrás, ⌘G toggle graph view.
	4.	Tags — Syntax #tag con vista filtrada por tag.
	5.	Full-text search — Buscar dentro del contenido de todos los nodos, no solo títulos.
	6.	Confirmar nombre del proyecto — Está llamado “Aurelius” (por Marcus Aurelius, el estoico famoso por sus diarios). El usuario no ha confirmado ni rechazado el nombre aún.

Decisiones de diseño tomadas
	∙	Una sola carpeta vault (como Obsidian), el usuario la elige al primer launch
	∙	Navegación: click en bloque abre vista enfocada con breadcrumb drill-down
	∙	Visual: oscuro con acento de color estilo Tana
	∙	El repo aún no está en GitHub — el usuario lo va a subir manualmente con los comandos provistos​​​​​​​​​​​​​​​​