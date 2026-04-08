# Figma Naming Convention Spec
## For HubSpot Automated Page Building

**Status:** Draft v1.0
**Author:** BFJ Media
**Last Updated:** April 2026

> This spec is the contract between the Figma designer and the Claude automation pipeline.
> If the Figma file follows this convention, Claude can generate HubSpot modules accurately and automatically.
> If it doesn't, the pipeline falls back to guesswork and manual correction.

---

## Core Rules

1. All names are **kebab-case** (lowercase, words separated by hyphens)
2. Every content layer that should become an editable field **must have a type hint** in square brackets
3. Layers without a type hint are treated as **decorative/static** and ignored by the pipeline
4. Nesting = grouping (a sub-frame becomes a field group in HubSpot)
5. The actual text/content in a Figma layer becomes the **default value** for that field

---

## Module Naming

Each top-level frame on a page = one HubSpot module.

**Format:** `module-name`

```
hero-banner          ✓
event-slider         ✓
cards-grid           ✓
HeroBanner           ✗  (no camelCase)
Hero Banner          ✗  (no spaces)
Frame 47             ✗  (no generic names)
```

The frame name becomes:
- The module folder name: `hero-banner.module/`
- The CSS class prefix: `.hero-banner`
- The label in HubSpot Design Manager: `Hero Banner`

---

## Field Naming

**Format:** `field-name [type]`

The field name becomes the `name` key in `fields.json` (converted to snake_case).
The type hint tells Claude what kind of HubSpot field to generate.

```
heading [text]                 →  { "name": "heading", "type": "text" }
body-copy [richtext]           →  { "name": "body_copy", "type": "richtext" }
background-image [image]       →  { "name": "background_image", "type": "image" }
event-date [text]              →  { "name": "event_date", "type": "text" }
```

---

## Field Type Hints

| Figma type hint | HubSpot field type | Notes |
|---|---|---|
| `[text]` | `text` | Single line. Use for headings, labels, short copy |
| `[richtext]` | `richtext` | Multi-line with formatting. Use for body copy, descriptions |
| `[image]` | `image` | Src + alt text |
| `[link]` | `link` | URL + open in new tab option |
| `[boolean]` | `boolean` | Toggle. Use for show/hide flags |
| `[number]` | `number` | Numeric input |
| `[choice]` | `choice` | Dropdown. Must also define options — see below |
| `[video]` | `videoplayer` | HubSpot video embed |
| `[url]` | `url` | Plain URL string (no open-in-new-tab) |
| `[color]` | `choice` | Always generates a brand color dropdown, never a hex picker |

---

## Default Values

For **content fields** (`[text]`, `[richtext]`, `[image]`):
The actual content visible in the Figma layer is automatically used as the default.

```
A text layer named "heading [text]" containing "Welcome to HVivo"
→ default: "Welcome to HVivo"

An image layer named "hero-image [image]"
→ default src pulled from the Figma image fill
```

For **choice fields and style fields**, defaults are declared explicitly with `=`:

```
theme_color=green-dark
padding_top=large
columns=3
```

---

## Groups (Nested Fields)

A sub-frame inside a module frame becomes a **field group** in HubSpot.

**Format:** Sub-frame named `group-name` (no type hint needed — the nesting implies grouping)

```
hero-banner/
  heading [text]
  copy [richtext]
  cta/                        ← sub-frame = group named "cta"
    text [text]
    url [link]
    open-in-new-tab [boolean]
```

Generates:
```json
{
  "name": "cta",
  "type": "group",
  "children": [
    { "name": "text", "type": "text" },
    { "name": "url", "type": "link" }
  ]
}
```

---

## Repeaters (Lists of Items)

For repeating items like cards, team members, logos, or tabs — mark the parent frame with `*`.

**Format:** `field-name* [group]`

```
cards* [group]/               ← asterisk = repeater
  title [text]
  copy [richtext]
  image [image]
  link [link]
```

Generates a `group` field with `occurrence` (min/max) in `fields.json`.

**Setting min/max items:** Add a `_meta` layer inside the repeater frame:

```
cards* [group]/
  _meta  min=1 max=12         ← plain text layer with meta instructions
  title [text]
  copy [richtext]
```

If no `_meta` is present, Claude defaults to `min=1, max=10`.

---

## Choice Field Options

When using `[choice]`, define the available options in a `_options` layer immediately inside the field's parent frame.

**Format:** `_options  value1:Label 1, value2:Label 2`

```
card-style [choice]
_options  solid:Solid, outline:Outline, ghost:Ghost
```

Or for brand color dropdowns, use the shorthand `[color]` — this automatically generates the full 8-option brand color dropdown without needing `_options`.

---

## The Style Group

Every module has a reserved sub-frame called `style` which maps to HubSpot's **Style tab**.
Fields inside `style/` use the `field-name=default-value` format.

**Standard style fields (always include these):**

```
style/
  heading_tag=h2              ← h1/h2/h3/h4 choice
  theme_color=white           ← brand color choice (section background)
  padding_top=medium          ← none/xsmall/small/medium/large/xlarge
  padding_bottom=medium
```

**Optional style fields:**

```
style/
  card_bg_color=white         ← card background color
  button_color=green-dark     ← CTA button color
  columns=3                   ← 2/3/4 column layout choice
```

Standard padding values: `none` · `xsmall` · `small` · `medium` · `large` · `xlarge`
Standard theme_color values: `green-dark` · `green` · `green-light` · `purple-dark` · `purple-light` · `oak` · `ocean-light` · `white`

---

## Reserved / Auto-Generated Fields

These are **always added automatically** by the pipeline — do not name them in Figma:

| Field | What it does |
|---|---|
| `section_id` | Anchor ID for sticky nav / URL hash links |
| `style` group wrapper | Generated automatically from the `style/` frame |

---

## Visibility Conditions

To make a field only appear in HubSpot when another field has a specific value, add a `_visible-when` annotation on the layer:

**Format:** `_visible-when  controlling-field=value`

```
style/
  columns=3
  card_style=dark
  button_color=green-dark  _visible-when  cta_type=button
```

This tells Claude to add a `display_conditions` rule to `button_color` so it only shows when `cta_type` is set to `button`.

---

## Complete Example: Event Slider Module

```
event-slider/
│
├── heading [text]                    "Upcoming Events"
├── copy [richtext]                   "<p>Join us at our next event.</p>"
│
├── cta/
│   ├── text [text]                   "View All Events"
│   └── url [link]
│
└── style/
    ├── heading_tag=h2
    ├── theme_color=white
    ├── card_style=dark
    ├── padding_top=medium
    └── padding_bottom=medium
```

**Generated output:**

`fields.json` — 8 fields across content and style tabs
`module.html` — HubL template with correct field references
`module.css` — scoped styles using `--section-*` CSS custom properties
Default content — heading and copy pre-populated from Figma text layers

---

## Complete Example: Cards Module (with Repeater)

```
cards/
│
├── heading [text]                    "Why Choose HVivo"
│
├── cards* [group]/
│   ├── _meta  min=1 max=12
│   ├── icon [image]
│   ├── title [text]                  "Card Title"
│   └── copy [richtext]               "<p>Description here.</p>"
│
└── style/
    ├── heading_tag=h2
    ├── card_bg_color=purple-dark
    ├── theme_color=green-dark
    ├── columns=3
    ├── padding_top=medium
    └── padding_bottom=medium
```

---

## Quick Reference Checklist for Designers

Before handing off a Figma file for automated build:

- [ ] Every top-level section frame is named in kebab-case
- [ ] No frames named `Frame XX`, `Group`, or `Component X`
- [ ] Every editable layer has a type hint in `[square brackets]`
- [ ] Decorative/static layers have no type hint (they will be ignored)
- [ ] Repeating items use `*` on the parent frame
- [ ] Each module has a `style/` sub-frame with at least `theme_color` and padding defaults
- [ ] All colour fills use Figma local variables (not raw hex values)
- [ ] Choice fields have a `_options` layer defining their values
- [ ] Images are linked assets, not embedded (so they can be exported via API)

---

## What Happens If the Convention Isn't Followed

| Issue | Result |
|---|---|
| Layer has no type hint | Layer is skipped — field won't be created |
| Module frame name has spaces | Name is slugified but may produce unexpected results |
| No `style/` frame | Module gets default padding/theme fields only |
| Repeater missing `*` | Treated as a single group, not a repeater |
| Raw hex colour (no variable) | Claude attempts to match to brand palette — may be inaccurate |
| Deeply nested unlabelled frames | Claude skips the content and flags it for manual review |
