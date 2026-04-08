# HubSpot Figma-to-Code Pipeline

**BFJ Media · Internal Standard**

Standardized flow, documentation, and tooling for building HubSpot CMS websites from Figma designs using the automated Figma → HubSpot pipeline.

## 📖 Live Documentation

**→ [hubspot-figma-to-code Pipeline Guide](https://bfj-jess.github.io/hubspot-figma-to-code/)**

A presentable, browser-friendly overview of the entire 7-phase pipeline. Share this with devs, PMs, and non-technical stakeholders.

---

## What's in this Repo

| File | Purpose | Audience |
|---|---|---|
| [`index.html`](./index.html) | Live pipeline guide (served via GitHub Pages) | Everyone — devs, PMs, CEO |
| [`figma-to-hubspot-automation.md`](./figma-to-hubspot-automation.md) | **Main rulebook** — full pipeline spec, module field standards, image asset pipeline | Claude Code + developers |
| [`figma-naming-convention-spec.md`](./figma-naming-convention-spec.md) | Figma layer naming rules | Designers + developers |
| [`hubspot-fields-reference.md`](./hubspot-fields-reference.md) | All HubSpot module field types, properties, and default value shapes | Developers + Claude (mandatory reading before module generation) |
| [`scripts/figma-sync-images.js`](./scripts/figma-sync-images.js) | Canonical image sync script — exports from Figma, uploads to HubSpot File Manager, idempotent via manifest | Developers |

---

## Quick Start (New Project)

1. **Read the live docs** → [hubspot-figma-to-code Pipeline Guide](https://bfj-jess.github.io/hubspot-figma-to-code/)
2. Clone the HubSpot CMS boilerplate for the new project
3. Copy `scripts/figma-sync-images.js` into the new project's `scripts/` folder
4. Create `figma-sync.config.json` and empty `.figma-hubspot-manifest.json` at the project root
5. Set `FIGMA_TOKEN` and `HUBSPOT_TOKEN` env vars (the HubSpot token needs **`content`** and **`files`** scopes)
6. Run `hs cms watch` in a separate terminal and keep it running
7. Start generating modules with Claude Code following the pipeline phases

Full step-by-step in the [live pipeline guide](https://bfj-jess.github.io/hubspot-figma-to-code/).

---

## The 7 Phases (at a glance)

1. **Prepare the Figma File** — Style Guide page, naming convention, field type annotations
2. **Bootstrap the HubSpot Project** — clone boilerplate, auth CLI, start `hs cms watch`
3. **Set Up the Image Asset Pipeline** — copy sync script, config, manifest
4. **Generate Modules from Figma** — Claude generates `fields.json` / `module.html` / `module.css` / `meta.json` per frame
5. **Sync Images & Assets** — batch export Figma assets into HubSpot File Manager
6. **Create the Draft Page** — Claude builds the page via HubSpot Pages API
7. **QA, Review & Publish** — automated parity check, manual review, client approval, publish

---

## Contributing

This is an internal BFJ Media repository. When updating the pipeline:

- Keep `figma-to-hubspot-automation.md` as the source of truth for rules Claude follows
- Update `index.html` whenever the markdown docs change in a way that affects the standard flow
- Bump the version in both `README.md` and `index.html` footer when releasing a new revision
- Test the image sync script against a real project before merging changes

---

## Contact

Questions or ideas? Ping the BFJ dev channel, or reach out to Jess Pedrosa directly.

**Version:** 1.0 · April 2026
**Maintained by:** BFJ Media
