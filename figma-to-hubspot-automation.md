# Figma → HubSpot Automated Page Building

**Status:** Concept / In Development
**Author:** BFJ Media
**Last Updated:** April 2026

---

## Overview

The goal of this workflow is to automate the creation of HubSpot CMS pages directly from a Figma design using Claude Code CLI and MCP (Model Context Protocol). Given a properly structured Figma file, Claude should be able to:

1. Read the design via Figma MCP
2. Interpret each section as a HubSpot module and generate its files
3. Upload the modules to HubSpot via CMS API
4. Create a new HubSpot page and place all modules on it with default content
5. Return a draft preview URL

The end result is a near-complete HubSpot page built from a Figma design with minimal manual intervention — estimated **~80% automated, ~20% human review and cleanup**.

---

## The Pipeline (High Level)

```
[0] Project Bootstrap — clone boilerplate, auth CLI, upload theme to HubSpot
     │
     ▼
Figma Design
     │
     ▼
[1] Figma MCP — read frames, components, content, variables
     │
     ▼
[2] Claude — map design to module definitions (fields.json, module.html, module.css)
     │
     ▼
[3] HubSpot CMS API — upload generated module files
     │
     ▼
[4] HubSpot Pages API — create page, place modules with default content
     │
     ▼
Draft HubSpot Page URL
```

---

## Step-by-Step Breakdown

### Phase 0 — Project Bootstrap (New Projects Only)

> **This must be completed before anything else.** The Figma pipeline depends on the HubSpot theme already existing in Design Manager so that module upload paths resolve correctly.

**1. Clone the HubSpot CMS Boilerplate**

```bash
git clone https://github.com/HubSpot/cms-theme-boilerplate.git ProjectName
cd ProjectName
```

Use the client's project name as the folder name — this becomes the theme name in HubSpot Design Manager.

**2. Initialise Git for the project**

```bash
git init
git remote set-url origin <client-repo-url>
```

**3. Authenticate the HubSpot CLI against the client's account**

```bash
hs account auth --account=<account-id>
```

This uses the personal access key for the client's HubSpot portal. The account ID is found in HubSpot under Settings → Account Defaults.

**4. Upload the boilerplate theme to HubSpot**

```bash
hs cms upload src/ ProjectName --account=<account-id>
```

This establishes the theme in Design Manager under the path `custom/ProjectName/`. All subsequent module uploads and page references depend on this base path existing.

**5. Start the watch process**

```bash
hs cms watch src ProjectName --account=<account-id>
```

Keep this running in a dedicated terminal for the remainder of the session. All file changes will sync automatically — do not manually upload files while watch is active.

**6. Verify the theme is live**

In HubSpot → Marketing → Files and Templates → Design Tools, confirm the `ProjectName` folder is visible with the boilerplate files inside. The pipeline cannot proceed until this is confirmed.

**7. Bootstrap the Image Asset Pipeline**

Before any modules are generated, wire up the Tier 2 image pipeline so image-field defaults can be populated automatically. Full checklist is in [Image Asset Pipeline → Phase 0 Updated Bootstrap Checklist](#phase-0--updated-bootstrap-checklist-for-image-pipeline). Summary:

- Copy `figma-sync-images.js` from `D:\Jessiemar Works\BFJ\docs\scripts\` into `scripts/`
- Create `figma-sync.config.json` and `.figma-hubspot-manifest.json` at the project root
- Set `FIGMA_TOKEN` and `HUBSPOT_TOKEN` env vars
- Confirm the HubSpot Private App token has the **`files`** scope
- Smoke test with `node scripts/figma-sync-images.js help`

---

> **For existing projects** (theme already in HubSpot): skip Phase 0 entirely and go straight to Step 1.

---

### Step 1 — Figma MCP: Read the Design

The Figma MCP exposes:
- Frame and layer names
- Component structure and nesting
- Text content (`characters`)
- Styles (font size, weight, colour fills)
- Local variable definitions (colour tokens, spacing)
- Images as fill nodes

Claude reads the target Figma frame (e.g. the Homepage frame) and extracts all top-level sections, treating each as a separate HubSpot module.

---

### Step 2 — Claude: Interpret and Generate Module Files

This is the most important step. Claude maps the Figma structure to three files per module:

| File | Purpose |
|---|---|
| `fields.json` | Defines all editable fields (type, label, default value) |
| `module.html` | HubL template rendering the module's markup |
| `module.css` | Scoped styles for the module |

**This step only works reliably if the Figma file follows the naming convention spec** (see section below).

> ## ⚠️ MANDATORY — Read the HubSpot Fields Reference First
>
> **Before generating any module, Claude MUST read [`hubspot-fields-reference.md`](./hubspot-fields-reference.md) and familiarise itself with the valid field types, their exact property names, and default value shapes.**
>
> HubSpot is strict about field shapes. Each field type has its own required default structure, and misspelling a type or property key causes silent upload failures, broken editor UI, or pages that render blank. The most common mistakes:
>
> | Wrong guess | Correct type | Notes |
> |---|---|---|
> | `video` | `videoplayer` | For HubSpot-hosted video. Use `embed` for YouTube/Vimeo. |
> | `url` | `link` | `link` has full open-in-new-tab + rel options; `url` is the minimal simple URL field. |
> | `image` (for backgrounds) | `backgroundimage` | Backgrounds have a completely different default shape with `background_position` and `background_size`. |
> | `menu` | `simplemenu` | `menu` = reusable global menu. `simplemenu` = page-specific only. |
> | `icon` with any library | `icon` with `icon_set: "fontawesome-6.4.2"` | FontAwesome only; Material icons need inline SVG or `embed`. |
> | `file` | `file` with `picker` set | `picker` must be one of `file` / `document` / `image` / `video` / `audio`. |
> | Missing `font_set` on `font` | `font` with both `font` AND `font_set` | Fonts silently fail to load without both properties. |
> | `cta` field | *(Content Hub Pro/Ent only)* | Only use if the target portal has Content Hub Pro or Enterprise — otherwise modules break on upload. |
>
> **Never guess field types. Look them up every time.** The rule also applies to property names within a field type — e.g. `image` defaults need `size_type`, `src`, `alt`, `loading`; `link` defaults need `url.content_id`, `url.type`, `url.href`, `open_in_new_tab`, `no_follow`. Missing any of these causes errors that are painful to debug after the fact.
>
> Treat `hubspot-fields-reference.md` as required reading at the start of every module-generation run.

---

### Step 3 — Upload Modules via CMS API

Modules are uploaded to HubSpot's Design Manager. This must happen **before** the page is created, since the page references modules by their Design Manager path.

Upload order:
1. Generate all module files locally
2. Run `hs cms upload` or call the CMS Files API
3. Confirm paths resolve in HubSpot before proceeding

---

### Step 4 — Create Page via HubSpot Pages API

**Endpoint:** `POST /cms/v3/pages/site-pages`

Each module placed on the page maps to an entry in the `layoutSections.dnd_area.rows` array. The `params` object contains the module's field values (defaults pulled from the Figma content).

**Example payload:**

```json
{
  "name": "Homepage",
  "slug": "homepage",
  "templatePath": "custom/ProjectName/templates/base-dnd.html",
  "layoutSections": {
    "dnd_area": {
      "rows": [
        {
          "0": {
            "type": "custom_widget",
            "w": 12,
            "x": 0,
            "name": "hero_banner_1",
            "path": "custom/ProjectName/modules/hero-banner",
            "params": {
              "heading": "Welcome to HVivo",
              "subheading": "Advancing Human Challenge Studies",
              "cta": {
                "text": "Learn More",
                "url": { "href": "/about" }
              },
              "style": {
                "theme_color": "green-dark",
                "padding_top": "large",
                "padding_bottom": "large"
              }
            }
          }
        },
        {
          "0": {
            "type": "custom_widget",
            "w": 12,
            "x": 0,
            "name": "event_slider_1",
            "path": "custom/ProjectName/modules/event-slider",
            "params": {
              "heading": "Upcoming Events",
              "event_type": "in-person_event",
              "style": {
                "theme_color": "white",
                "padding_top": "medium",
                "padding_bottom": "medium"
              }
            }
          }
        }
      ]
    }
  }
}
```

Key notes:
- `w: 12` = full width (12-column grid)
- Each item in `rows` = one module stacked vertically
- `params` keys map directly to `fields.json` field `name` values
- The page is created as a **draft** — human review before publishing

---

## Module Field Standards (Local Modules)

> These standards are **mandatory for every Local Module** generated by the pipeline. **Global modules** (header, footer, navigation partials, cookie banners, etc.) are exempt — their structure is dictated by the design and they have their own field shapes.
>
> Claude determines whether a module is local or global from the Figma frame name (`header/`, `footer/`, `nav-*/` → global; everything else → local) and applies the standard below to all locals automatically.
>
> ⚠️ **Before generating any module, Claude must consult [`hubspot-fields-reference.md`](./hubspot-fields-reference.md)** for the correct field types, property names, and default value shapes. Never guess field types — see [Step 2 → MANDATORY callout](#step-2--claude-interpret-and-generate-module-files) for the rationale and common mistakes.

Every Local Module must follow this two-tab structure: a **Content Tab** (fields vary per module, with two universal rules) and a **Style Tab** (fully standardised — same field set on every module).

---

### Content Tab

Most Content Tab fields are derived from the Figma frame contents (heading text, body copy, images, repeaters, etc.) per the naming convention spec. On top of that, two rules are universal:

#### Rule 1 — Layout Dropdown (first field, when applicable)

If the Figma design shows **multiple layout variations** of the same module (e.g. side-by-side variants, image-left vs image-right, or column-count alternatives), the **first field** in the Content Tab must be a `layout` choice dropdown.

Claude detects variations either from sibling frames named `module-name--variant-a`, `module-name--variant-b`, etc., or from an explicit `[layout=...]` annotation in the Figma frame name.

**Column-based variations** must use this exact key/label set:

```json
{
  "name": "layout",
  "label": "Layout",
  "type": "choice",
  "display": "select",
  "choices": [
    ["2-col", "2 Columns"],
    ["3-col", "3 Columns"],
    ["4-col", "4 Columns"]
  ],
  "default": "3-col"
}
```

For non-column variations (e.g. `image-left` / `image-right`), use semantic keys that describe the variant.

#### Rule 2 — Section ID (last field, mandatory on every module)

Every Local Module's Content Tab must end with a `section_id` text field. This drives sticky-anchor-nav targets and any in-page jump links.

```json
{
  "name": "section_id",
  "label": "Section ID",
  "type": "text",
  "default": "",
  "inline_help_text": "Anchor ID for in-page links (no #). Leave empty for none."
}
```

In `module.html`, render it conditionally on the section element:

```html
<section{% if module.section_id %} id="{{ module.section_id }}"{% endif %} class="...">
```

---

### Style Tab

The Style Tab is **fully standardised**. Claude must emit **exactly this field set, in this order, on every Local Module** — no additions, no omissions, unless the module has a documented exception in its meta file.

```json
{
  "name": "style",
  "label": "Style",
  "type": "group",
  "tab": "STYLE",
  "children": [
    {
      "name": "heading_tag",
      "label": "Heading Tag",
      "type": "choice",
      "display": "select",
      "choices": [
        ["h1", "H1"],
        ["h2", "H2"],
        ["h3", "H3"],
        ["h4", "H4"]
      ],
      "default": "h2"
    },
    {
      "name": "background_type",
      "label": "Background Type",
      "type": "choice",
      "display": "select",
      "choices": [
        ["color", "Color"],
        ["image", "Image"]
      ],
      "default": "color"
    },
    {
      "name": "background_color",
      "label": "Background Color",
      "type": "choice",
      "display": "select",
      "choices": [ /* DYNAMIC — see "Dynamic choices" below */ ],
      "default": "white",
      "visibility": {
        "controlling_field": "style.background_type",
        "controlling_value_regex": "color",
        "operator": "EQUAL"
      }
    },
    {
      "name": "background_image",
      "label": "Background Image",
      "type": "backgroundimage",
      "default": {
        "src": "",
        "background_position": "MIDDLE_CENTER",
        "background_size": "cover"
      },
      "visibility": {
        "controlling_field": "style.background_type",
        "controlling_value_regex": "image",
        "operator": "EQUAL"
      }
    },
    {
      "name": "padding_top",
      "label": "Padding Top",
      "type": "choice",
      "display": "select",
      "choices": [ /* DYNAMIC — see "Dynamic choices" below */ ],
      "default": "medium"
    },
    {
      "name": "padding_bottom",
      "label": "Padding Bottom",
      "type": "choice",
      "display": "select",
      "choices": [ /* DYNAMIC — see "Dynamic choices" below */ ],
      "default": "medium"
    }
  ]
}
```

#### Field Reference

| Field | Type | Source | Notes |
|---|---|---|---|
| `heading_tag` | `choice` | **Static** | Always `H1`, `H2`, `H3`, `H4`. Default `h2`. Use the chosen tag for the section's primary heading element. |
| `background_type` | `choice` | **Static** | `color` or `image`. Drives the visibility toggle between `background_color` and `background_image`. Default `color`. |
| `background_color` | `choice` | **Dynamic** — Style Guide colour tokens | Choices populated at module-generation time from the colours defined on the project's Figma Style Guide page. Hidden when `background_type = image`. |
| `background_image` | `backgroundimage` | **Static field type** | The standard HubSpot background image control. Hidden when `background_type = color`. |
| `padding_top` | `choice` | **Dynamic** — Style Guide spacing tokens | Choices populated from the spacing scale defined on the project's Figma Style Guide page. |
| `padding_bottom` | `choice` | **Dynamic** — Style Guide spacing tokens | Same source as `padding_top`. |

#### Dynamic Choices — How They Are Populated

Hard-coding colour and spacing choices per project breaks pipeline portability. At the start of **every new project run**, Claude must:

1. Open the Figma **Style Guide** page (location defined in `figma-naming-convention-spec.md`)
2. Read the colour tokens via Figma local variables → use the token names as `background_color` choices
3. Read the spacing tokens (e.g. `none / xsmall / small / medium / large / xlarge`) → use those names as `padding_top` and `padding_bottom` choices
4. Cache the resulting lookup tables for the duration of the run and apply them to **every** Local Module's Style Tab

After resolution, a project's `background_color` choices might look like:

```json
"choices": [
  ["white", "White"],
  ["warm-white", "Warm White"],
  ["light-grey", "Light Grey"],
  ["steel-blue", "Steel Blue"],
  ["cobalt-blue", "Cobalt Blue"],
  ["coral-red", "Coral Red"]
]
```

…and the project's spacing choices might look like:

```json
"choices": [
  ["none",   "None"],
  ["xsmall", "X-Small"],
  ["small",  "Small"],
  ["medium", "Medium"],
  ["large",  "Large"],
  ["xlarge", "X-Large"]
]
```

Both sets are project-specific and must be regenerated for each new client.

#### Rendering the Style Tab in `module.html`

The standard wrapper pattern for every Local Module:

```html
{% set bg_attr = "" %}
{% if module.style.background_type == "image" and module.style.background_image.src %}
  {% set bg_attr = "background-image:url('" ~ module.style.background_image.src ~ "');background-position:" ~ (module.style.background_image.background_position|replace('_',' ')|lower) ~ ";background-size:" ~ module.style.background_image.background_size ~ ";" %}
{% endif %}

<section{% if module.section_id %} id="{{ module.section_id }}"{% endif %}
  class="my-module bg-{{ module.style.background_color }} pt-{{ module.style.padding_top }} pb-{{ module.style.padding_bottom }}"
  style="{{ bg_attr }}">

  <{{ module.style.heading_tag }} class="my-module__heading">{{ module.heading }}</{{ module.style.heading_tag }}>

  {# ... rest of module markup ... #}
</section>
```

The `bg-*`, `pt-*`, `pb-*` utility classes are defined once in the project's global CSS and consume the Style Guide tokens, so the same class names work across every module.

---

### Global Modules — Exempt

Global modules (`header`, `footer`, navigation partials, cookie banners, announcement bars, etc.) **do not follow this standard**. Their field shapes are dictated by the navigation/footer structure of the design and typically include logos, menu repeaters, social links, copyright text, sticky toggles, and so on.

Global modules may include a Style Tab if appropriate, but its contents are **not standardised** — Claude generates whatever the design and global usage actually require.

---

## Image Asset Pipeline

> Official standard for getting image assets (SVG, PNG, JPG) out of Figma and into HubSpot File Manager **without any manual uploads**. This pipeline runs as part of every `/build-from-figma` invocation. No human ever downloads from Figma or drags files into the HubSpot UI.

### 3-Tier Asset Strategy

Different asset types get handled differently. Claude decides which tier applies based on the asset's role in the design.

| Tier | Asset type | Destination | Used for |
|---|---|---|---|
| **Tier 1** | Foundational brand assets | `src/images/` in the theme | Logos, icon sets, reusable vectors — the ~10–20 assets that appear everywhere and rarely change |
| **Tier 2** | Design-specific imagery | HubSpot File Manager via script | Hero shots, card photos, team portraits, tagline badges, backgrounds |
| **Tier 3** | Small UI icons | Inline SVG in `module.html` | Chevrons, arrows, social glyphs, play buttons, checkmarks — anything ≤ ~2KB |

#### Tier 1 — Theme Assets (`src/images/`)

SVG dropped into `src/images/` in the theme folder. `hs cms upload` syncs them to `raw_assets/public/{Theme}/images/`. Reference in `fields.json` as a raw asset URL:

```json
"src": "https://{portal}.fs1.hubspotusercontent-na2.net/hubfs/{portal}/raw_assets/public/{Theme}/images/logo.svg"
```

**Use when:** the asset is part of the theme's visual language, not specific to any one module or page.

#### Tier 2 — Figma → HubSpot Files API (main automated path)

Runs through the standardized script at **`D:\Jessiemar Works\BFJ\docs\scripts\figma-sync-images.js`**. Full details in the next section.

**Use when:** the asset is pulled directly from a Figma design and needs a stable, permanent URL for a module default.

#### Tier 3 — Inline SVG

Figma vectors are fetched via the SVG export endpoint and the raw SVG markup is embedded directly into `module.html`. Zero hosting, zero HTTP requests, can be coloured via `fill="currentColor"`, scales cleanly.

**Use when:** the asset is ≤ ~2KB, appears in multiple variants, or needs runtime colour/size control. Social icons, chevrons, play buttons and similar.

---

### Tier 2 Canonical Flow — `figma-sync-images.js`

The Tier 2 script is the **official standardized flow** for image assets. It lives at:

**`D:\Jessiemar Works\BFJ\docs\scripts\figma-sync-images.js`**

Copy this script into every new project's `scripts/` folder as part of Phase 0 bootstrapping. It has **zero npm dependencies** (uses Node.js 18+ built-in `fetch`).

#### What it does

```
1. Walk Figma frame tree → collect image-fill nodes (or explicit node list)

2. Check local manifest (.figma-hubspot-manifest.json):
   If node already uploaded in this format/scale → use cached HubSpot URL, skip

3. Figma REST API — batch export:
   GET /v1/images/{file_key}?ids={n1,n2,...}&format=svg
   → { "n1": "https://s3-figma-exports.../n1.svg", ... }

4. HubSpot Files API — import by URL (async):
   POST /files/v3/files/import-from-url/async
   {
     "name": "hero-banner-bg.svg",
     "access": "PUBLIC_NOT_INDEXABLE",
     "folderPath": "/ProjectName/module-defaults/hero-banner",
     "url": "<figma s3 url from step 3>",
     "overwrite": true
   }
   → { "id": "<task-id>" }

5. Poll the async task every 2s (120s timeout):
   GET /files/v3/files/import-from-url/async/tasks/{taskId}/status
   → { "status": "COMPLETE", "result": { "id": 12345, "url": "https://..." } }

6. Write result into manifest + return HubSpot URL to caller

7. Caller (module generator) drops the URL into fields.json as the `src` default
```

**Idempotency is the key contract.** The manifest is committed to the repo. On re-runs, cached entries are skipped — you never upload the same asset twice unless you pass `--force`.

#### Manifest file — `.figma-hubspot-manifest.json`

Lives at the project root. Auto-managed by the script. **Commit it.** Treat it as authoritative state.

```json
{
  "version": 1,
  "updated": "2026-04-08T10:30:00Z",
  "entries": {
    "12445:4361|svg|1": {
      "node": "12445:4361",
      "name": "hero-banner-bg",
      "format": "svg",
      "scale": 1,
      "folder": "/GlassLadder/module-defaults/hero-banner",
      "hubspot_id": 123456789,
      "hubspot_url": "https://442856241.fs1.hubspotusercontent-na2.net/hubfs/.../hero-banner-bg.svg",
      "uploaded_at": "2026-04-08T10:30:00Z"
    }
  }
}
```

Manifest keys are `{nodeId}|{format}|{scale}` so the same node can exist in multiple formats (e.g. `svg` and `png@2x`) without colliding.

#### Project config — `figma-sync.config.json`

Lives at the project root. Committed.

```json
{
  "figmaFileKey": "PbIDdZLqygEZzeqwpIezhL",
  "defaultFolder": "/GlassLadder/module-defaults"
}
```

Tokens come from environment variables (never committed):

```bash
export FIGMA_TOKEN="figd_..."
export HUBSPOT_TOKEN="pat-ap1-..."
```

#### Required HubSpot scopes

The HubSpot Private App token must have:

- `content` — for pages and modules (existing in all BFJ project tokens)
- **`files`** — for the Files API (**NEW — must be added before running this script**)
- `files.ui_hidden.read` — optional, useful for managing hidden default files

If the script errors with a 401 / 403 on the first POST, add the `files` scope to the Private App and rotate the token.

#### CLI usage

> **Windows Git Bash users:** prefix every invocation with `MSYS_NO_PATHCONV=1` to stop MSYS from converting `--folder=/...` into a Windows path. PowerShell and macOS/Linux shells are unaffected.

```bash
# Sync a single Figma node
node scripts/figma-sync-images.js sync 12445:4361 \
  --name=hero-banner-bg \
  --format=svg \
  --folder=/GlassLadder/module-defaults/hero-banner

# Batch sync from a plan file
node scripts/figma-sync-images.js batch sync-plan.json

# Show manifest contents
node scripts/figma-sync-images.js list

# Force re-upload (bypass manifest cache)
node scripts/figma-sync-images.js sync 12445:4361 --force

# Dry run — no uploads
node scripts/figma-sync-images.js sync 12445:4361 --dry-run

# Help
node scripts/figma-sync-images.js help
```

#### Batch plan file format

For `batch` mode, pass a JSON file listing all nodes to sync:

```json
{
  "figmaFileKey": "PbIDdZLqygEZzeqwpIezhL",
  "defaultFolder": "/GlassLadder/module-defaults",
  "items": [
    {
      "node": "12445:4361",
      "name": "hero-banner-bg",
      "format": "svg",
      "folder": "/GlassLadder/module-defaults/hero-banner"
    },
    {
      "node": "12502:43137",
      "name": "footer-logo",
      "format": "svg",
      "folder": "/GlassLadder/module-defaults/footer"
    },
    {
      "node": "12509:22039",
      "name": "cilla-badge",
      "format": "svg",
      "folder": "/GlassLadder/module-defaults/image-text-list"
    }
  ]
}
```

The `figmaFileKey` and `defaultFolder` in the plan override the project config for this run.

#### HubSpot folder structure

Every project must mirror this folder layout in HubSpot File Manager:

```
/{ProjectName}/module-defaults/
  hero-banner/
  content-cards/
  image-text-list/
  team/
  footer/
  ...
```

One folder per module. Assets stay grouped with the module that uses them, which makes cleanup trivial if a module is removed or renamed. Folders are auto-created on first upload — no manual folder creation needed.

#### Integration with `/build-from-figma`

When the slash command runs, the Tier 2 image pipeline fires automatically:

```
Phase 1 — Figma read
  ↓ walk the target frame tree
  ↓ identify every image-fill node + every exportable vector flagged as Tier 2

Phase 2 — Image sync (Tier 2)
  ↓ build a sync plan from detected nodes (one item per image)
  ↓ run `node scripts/figma-sync-images.js batch <plan>`
  ↓ manifest updated, HubSpot URLs returned

Phase 3 — Module generation
  ↓ when writing fields.json, use the HubSpot URL from the manifest
    for each image field's `src` default

Phase 4 — Upload modules + create page
  ↓ as normal per Steps 3–4 above
```

**No human ever touches image files.** The only manual step is the initial Phase 0 scope-token setup.

---

### Known Limits & Risks

| Risk | Mitigation |
|---|---|
| Figma S3 URLs expire (~30 days) | Always cache the final HubSpot URL, never the Figma S3 URL. The manifest only stores HubSpot URLs. |
| Figma image-export rate limit (~2 req/sec) | Batch multiple node IDs into a single `GET /v1/images/...?ids=a,b,c` call. The script does this in batch mode. |
| HubSpot Files API rate limit | Generous (~100 req / 10s). Rarely hit in practice; no throttling needed. |
| SVGs with embedded raster images balloon in size | Prefer `format=svg` for true vectors, `format=png` or `jpg` for photographic content. Choose per-asset in the plan file. |
| Re-runs producing duplicates | Manifest prevents this. If you delete the manifest, the next run **WILL** re-upload everything. Commit the manifest. |
| Missing `files` scope on HubSpot token | Script errors on the first POST with a clear 401/403. Add the scope and rotate the token. |
| Async task polling timeout | Default 120s. Large assets may need longer; tune `POLL_TIMEOUT_MS` in the script if needed. |
| **Git Bash on Windows mangles `--folder=/...` paths** | MSYS auto-converts any argument starting with `/` into a Windows path (e.g. `/GlassLadder/...` → `C:/Program Files/Git/GlassLadder/...`). **Always prefix Windows Git Bash invocations with `MSYS_NO_PATHCONV=1`**, or set it in your shell profile. Native PowerShell and macOS/Linux shells are unaffected. |

---

### Phase 0 — Updated Bootstrap Checklist for Image Pipeline

Add these steps to Phase 0 when starting a new project:

1. Copy `figma-sync-images.js` from `D:\Jessiemar Works\BFJ\docs\scripts\` into the project's `scripts/` folder
2. Create `figma-sync.config.json` at the project root with `figmaFileKey` and `defaultFolder`
3. Create an empty manifest: `.figma-hubspot-manifest.json` with `{"version": 1, "entries": {}}` (or let the script create it on first run)
4. **Commit all three** to version control — yes, including the manifest
5. Add `FIGMA_TOKEN` and `HUBSPOT_TOKEN` to the shell environment (or a local `.env` that is git-ignored)
6. Confirm the HubSpot Private App token has the **`files`** scope — add it if missing and rotate
7. Smoke test: `node scripts/figma-sync-images.js help` then `node scripts/figma-sync-images.js list`
8. First real test: `node scripts/figma-sync-images.js sync <test-node-id> --dry-run` to confirm Figma export works without uploading

Once these 8 steps are done, the image pipeline is live and `/build-from-figma` can use it automatically.

---

## The Critical Prerequisite: Figma Naming Convention Spec

> Full spec is documented separately: [`figma-naming-convention-spec.md`](./figma-naming-convention-spec.md)

The entire automation depends on a shared naming contract between the Figma designer and the Claude pipeline. Without this, Step 2 is guesswork. With it, module generation is near-deterministic.

### Proposed Convention

```
[module-name]/                        ← top-level frame = module name (kebab-case)
  [field-name] [type]                 ← layer name + type hint in square brackets
  [group-name]/                       ← nested group
    [field-name] [type]
  style/                              ← reserved: style fields
    [field-name]=[default-value]      ← default value after equals sign
```

### Field Type Hints

| Figma layer suffix | HubSpot field type |
|---|---|
| `[text]` | `text` |
| `[richtext]` | `richtext` |
| `[image]` | `image` |
| `[link]` | `link` |
| `[boolean]` | `boolean` |
| `[number]` | `number` |
| `[choice]` | `choice` |
| `[richtext]` | `richtext` |

### Repeater Convention

For repeating items (cards, team members, logos), wrap in a parent frame named `[field-name]* [group]`:

```
cards* [group]/           ← asterisk = repeater
  title [text]
  copy [richtext]
  image [image]
  link [link]
```

### Real Example: Hero Banner

```
hero-banner/
  heading [text]            → "Optimising Drug Development"
  copy [richtext]           → "<p>We accelerate...</p>"
  cta/
    text [text]             → "Get in Touch"
    url [link]              → "/contact"
  style/
    theme_color=green-dark
    padding_top=large
    padding_bottom=large
```

This would generate:

```json
// fields.json (excerpt)
{ "name": "heading", "type": "text", "default": "Optimising Drug Development" },
{ "name": "copy", "type": "richtext", "default": "<p>We accelerate...</p>" },
{
  "name": "cta", "type": "group", "children": [
    { "name": "text", "type": "text", "default": "Get in Touch" },
    { "name": "url", "type": "link" }
  ]
}
```

---

## What's Hard (and How to Solve It)

### CSS Accuracy

**Problem:** Figma gives exact pixel values but generating correct CSS structure (flexbox, grid, positioning) requires judgment calls.

**Mitigations:**
- Figma's auto-layout maps closely to CSS flexbox — use it consistently
- Annotate layout direction on frames (`[row]` / `[column]` / `[grid]`)
- Colour fills map to CSS variables via Figma local variable definitions

**Reality:** The generated CSS will be structurally sound but may need visual polish. This is the most likely area requiring human review.

---

### Colour Mapping

**Problem:** Figma gives hex values; HubSpot modules use CSS custom properties.

**Solution:** At the start of each run, Claude reads Figma's local variable definitions via MCP and builds a lookup table:

```
#05241C → var(--color-green-dark)  → theme key: green-dark
#00E082 → var(--color-green-light) → theme key: green-light
```

This makes colour mapping fully automatic for projects using Figma local variables (which all BFJ projects should).

---

### Image Export and Upload

**Problem:** Figma images are node references, not usable URLs.

**Solution:** See the full [**Image Asset Pipeline**](#image-asset-pipeline) section above. Short version: the canonical `figma-sync-images.js` script handles Figma export → HubSpot Files API upload → manifest caching end-to-end. No manual file handling ever.

---

### Module Path Dependency

**Problem:** HubSpot page creation requires the exact Design Manager path of each module, which only exists after upload.

**Solution:** Enforce upload → confirm → build-page order in the pipeline. After upload, verify each path resolves before calling the Pages API.

---

## Proposed Slash Command: `/build-from-figma`

```
/build-from-figma <figma-frame-url> --page="Homepage" --account=147636634
```

**What it would do:**
1. Pull the Figma frame structure via MCP
2. Detect all top-level sections (modules) using the naming convention
3. **Run the Tier 2 image pipeline** — build a sync plan, call `figma-sync-images.js batch`, and resolve every image node to a permanent HubSpot URL (see [Image Asset Pipeline](#image-asset-pipeline))
4. Generate `fields.json`, `module.html`, `module.css` for each module locally, using the resolved HubSpot URLs as `src` defaults
5. Upload modules via `hs cms upload` or CMS API
6. Call HubSpot Pages API to create a draft page with all modules placed and default content populated
7. Output the HubSpot draft preview URL

**Arguments:**
- `<figma-frame-url>` — link to the specific Figma frame (e.g. the Homepage frame)
- `--page` — the name for the new HubSpot page
- `--account` — HubSpot account ID (can default from `hs` CLI config)
- `--draft` — (default true) create as draft, don't publish
- `--modules-only` — skip page creation, only generate and upload modules

---

## What's Needed Before Prototyping

**Phase 0 (Bootstrap)**
- [ ] Identify a test HubSpot account/sandbox to build against
- [ ] Clone boilerplate, authenticate CLI, and confirm theme is live in Design Manager
- [ ] Confirm `hs cms watch` is running and syncing correctly

**Figma Setup**
- [ ] Finalise and agree on the Figma naming convention spec above
- [ ] Apply the convention to a test Figma frame (a single, simple page — not a full site)
- [ ] Confirm Figma local variable definitions are set up and MCP can read them correctly

**HubSpot Setup**
- [ ] Map out the DnD base template structure needed for programmatic page creation
- [ ] Confirm HubSpot Pages API access is working with the account's personal access key

---

## Notes for Future Reference

- This workflow targets **DnD (drag-and-drop) HubSpot templates** — not fixed-layout templates — because DnD allows programmatic module placement via the API
- The approach is language/platform agnostic in principle — the same pipeline concept could apply to WordPress, Webflow, or other CMS platforms with API access
- The accuracy of Step 2 improves significantly as Claude builds familiarity with a project's existing module patterns — running this on a second or third page of the same project will be substantially better than the first
- All generated modules should go through the normal code review process before the page goes live
