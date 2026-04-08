# HubSpot Module & Theme Fields Reference

> **Source of truth for all available HubSpot field types.**
> Use this to eliminate guesswork when mapping Figma components to HubSpot module fields.
>
> Docs: https://developers.hubspot.com/docs/cms/reference/fields/module-theme-fields
> Last reviewed: April 2026

---

## Common Properties (All Fields)

Every field type shares these base properties.

| Property | Type | Description | Default |
|---|---|---|---|
| `name` | String | Internal field name. No spaces or special characters. | — |
| `label` | String | Display label shown to content editors. | — |
| `type` | String | The field type identifier (see each field below). | — |
| `required` | Boolean | If `true`, content can't be published without a value. | `false` |
| `locked` | Boolean | If `true`, the field is hidden from the content editor. | `false` |
| `inline_help_text` | String | Help text shown below the field label (max 400 chars). Supports basic HTML tags. | — |
| `help_text` | String | Tooltip text shown on hover (max 300 chars). | — |
| `id` | String | Unique ID set by HubSpot. Not required when building locally. | — |
| `visibility` | Array | Conditional display rules for the field. | — |
| `display_width` | String | Set to `half_width` on two consecutive fields to display them side by side. | Full width |
| `alias_mapping` | Object | Maps old field values to a new location without breaking live content. | — |

---

## Field Types

### `alignment`

**Style field.** Positions an element (horizontal and/or vertical) within a container.
For text alignment specifically, use `text_alignment` instead.

| Property | Type | Options | Default |
|---|---|---|---|
| `alignment_direction` | String | `HORIZONTAL`, `VERTICAL`, `BOTH` | `BOTH` |
| `default.horizontal_align` | String | `LEFT`, `CENTER`, `RIGHT` | — |
| `default.vertical_align` | String | `TOP`, `MIDDLE`, `BOTTOM` | — |

```json
{
  "name": "img_position",
  "label": "Position Image",
  "type": "alignment",
  "alignment_direction": "BOTH",
  "default": {
    "horizontal_align": "CENTER",
    "vertical_align": "TOP"
  }
}
```

---

### `backgroundimage`

**Style field.** Background image with position and size subfields.
Exposes a `.css` property that returns ready-to-use CSS.

| Property | Type | Description | Default |
|---|---|---|---|
| `default.src` | String | URL of the default image. | — |
| `default.background_position` | String | e.g. `MIDDLE_CENTER` | — |
| `default.background_size` | String | e.g. `cover`, `contain` | — |

```json
{
  "name": "bg_image",
  "label": "Background Image",
  "type": "backgroundimage",
  "default": {
    "src": "https://example.com/img.png",
    "background_position": "MIDDLE_CENTER",
    "background_size": "cover"
  }
}
```

---

### `blog`

Lets editors select a blog from the account. Returns the blog ID.
Useful for pulling teaser content or blog-related HubL functions.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | `"default"` or blog ID | Which blog is pre-selected. | `null` |

```json
{
  "name": "blog",
  "label": "Blog",
  "type": "blog",
  "default": "default"
}
```

---

### `boolean`

Toggle or checkbox to enable/disable functionality. Only `true` or `false`.
Use `choice` instead if you may need more than two states in future.

| Property | Type | Options | Default |
|---|---|---|---|
| `display` | String | `toggle`, `checkbox` | `checkbox` |
| `default` | Boolean | `true`, `false` | `false` |

```json
{
  "name": "show_image",
  "label": "Show Image",
  "type": "boolean",
  "display": "toggle",
  "default": false
}
```

---

### `border`

**Style field.** UI for setting element borders per side.
Exposes a `.css` property.

| Property | Type | Description | Default |
|---|---|---|---|
| `allow_custom_border_sides` | Boolean | When `true`, allows editors to set borders per side independently. | `false` |
| `default` | Object | Keys: `top`, `bottom`, `left`, `right`. Each can contain `width`, `opacity`, `style`, `color`. | `{}` |

```json
{
  "name": "border",
  "label": "Border",
  "type": "border",
  "allow_custom_border_sides": true,
  "default": {
    "top": { "width": { "value": 1, "units": "px" }, "opacity": 100, "style": "solid", "color": "#000000" }
  }
}
```

---

### `choice`

**Style field (modules and themes).** Dropdown, radio, checkboxes, or button presets.

| Property | Type | Description | Default |
|---|---|---|---|
| `choices` | Array | Array of `["value", "Label"]` pairs. | — |
| `default` | Value | Pre-selected value. | — |
| `multiple` | Boolean | Allow multiple selections. | `false` |
| `display` | String | `select`, `checkbox`, `radio`, `buttons` | `select` |
| `reordering_enabled` | Boolean | Lets editors reorder options. Requires `multiple: true`. | `false` |
| `preset` | String | Button preset (see table below). Used when `display: "buttons"`. | — |

**Button presets:**

| Preset | Valid choice labels |
|---|---|
| `case` | `none`, `title`, `upper`, `lower` |
| `expand_icon` | `caret`, `plus`, `chevron` |
| `icon_background_shape` | `none`, `square`, `rounded`, `circle` |
| `icon_size` | `small`, `medium`, `large` |
| `layout` | `cards`, `tiles`, `minimal` |
| `social_icon_background_shape` | `none`, `square`, `rounded`, `circle` |
| `social_icon_size` | `small`, `medium`, `large` |

```json
{
  "name": "img_position",
  "label": "Image Position",
  "type": "choice",
  "display": "select",
  "multiple": false,
  "choices": [
    ["img--left", "Image Left"],
    ["img--right", "Image Right"]
  ],
  "default": "img--left"
}
```

---

### `color`

**Style field (modules and themes).** Color picker with optional opacity control.

| Property | Type | Description | Default |
|---|---|---|---|
| `default.color` | String | Hex color value. | `#ffffff` |
| `default.opacity` | Number | 0–100. | `100` |
| `show_opacity` | Boolean | Whether to show the opacity input. Hidden in email modules by default. | `undefined` |
| `limited_options` | Array | Restrict available colours to a predefined list of hex values. | `undefined` |

```json
{
  "name": "text_color",
  "label": "Text Color",
  "type": "color",
  "default": {
    "color": "#000000",
    "opacity": 100
  }
}
```

---

### `cta`

Lets editors pick a HubSpot CTA to display.
**Content Hub Professional/Enterprise only.**

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | CTA ID (found in the CTA manager URL). | `null` |

```json
{
  "name": "cta",
  "label": "CTA",
  "type": "cta",
  "default": null
}
```

---

### `crmobject`

Lets editors select an individual CRM object instance.
**Content Hub Professional/Enterprise only.**

| Property | Type | Description | Default |
|---|---|---|---|
| `object_type` | String | e.g. `CONTACT`, `COMPANY`, `PRODUCT`, `DEAL`, `TICKET` | — |
| `properties_to_fetch` | Array | Limit which properties are returned (e.g. `["name", "hs_cost_of_goods_sold"]`). | — |
| `default.id` | Integer | Default object instance ID. | `null` |

```json
{
  "name": "featured_product",
  "label": "Featured Product",
  "type": "crmobject",
  "object_type": "PRODUCT",
  "properties_to_fetch": ["name", "description", "price"],
  "default": { "id": null }
}
```

---

### `crmobjectproperty`

Lets editors select a property from a CRM object type (returns metadata like label and name).
**Content Hub Professional/Enterprise only.**

| Property | Type | Description |
|---|---|---|
| `object_type` | String | CRM object type (e.g. `PRODUCT`, `CONTACT`). |
| `default.property` | String | Default property internal name. |

```json
{
  "name": "table_heading",
  "label": "Table Heading Property",
  "type": "crmobjectproperty",
  "object_type": "PRODUCT",
  "default": { "property": "hs_cost_of_goods_sold" }
}
```

---

### `date`

Date picker for editors. Returns a Unix timestamp.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Timestamp | Unix epoch timestamp for default date. | `null` |

```json
{
  "name": "event_date",
  "label": "Event Date",
  "type": "date",
  "default": null
}
```

---

### `datetime`

Date and time picker. Returns a Unix timestamp.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Timestamp | Unix epoch timestamp. | `null` |
| `step` | Number | Minute increment for the time picker (e.g. `15`). | — |

```json
{
  "name": "event_datetime",
  "label": "Event Date & Time",
  "type": "datetime",
  "step": 15,
  "default": null
}
```

---

### `email`

Lets editors select or enter email addresses. Returns an array.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Array | Array of email address strings. | `null` |
| `allow_custom_email_addresses` | Boolean | When `false`, only account user emails can be selected. | — |

```json
{
  "name": "contact_email",
  "label": "Contact Email",
  "type": "email",
  "allow_custom_email_addresses": true,
  "default": null
}
```

---

### `embed`

Accepts oEmbed URLs or raw embed code. Useful for third-party media.

| Property | Type | Description | Default |
|---|---|---|---|
| `supported_source_types` | Array | `oembed`, `html`, `media_bridge` | `["oembed", "html"]` |
| `supported_oembed_types` | Array | `photo`, `video`, `link`, `rich` | All four |
| `resizable` | Boolean | Allow editors to resize the embed. | `true` |
| `show_preview` | Boolean | Show embed preview in editor. | `true` |
| `default.source_type` | String | Default source type. | `oembed` |

```json
{
  "name": "video_embed",
  "label": "Video Embed",
  "type": "embed",
  "supported_source_types": ["oembed"],
  "supported_oembed_types": ["video"],
  "resizable": false,
  "default": { "source_type": "oembed" }
}
```

---

### `file`

File picker from the HubSpot File Manager or Document Manager. Use `image` for images.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | File URL. | `null` |
| `picker` | String | `file`, `document`, `image`, `video`, `audio` | `file` |

```json
{
  "name": "pdf_download",
  "label": "PDF Download",
  "type": "file",
  "picker": "document",
  "default": null
}
```

---

### `followupemail`

⚠️ **Deprecated.** Use form field's built-in followup email instead.
Assigns a followup email to a form submission.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | Email ID. | `null` |

---

### `font`

**Style field (modules and themes).** Full font styling controls: family, size, colour, bold, italic, underline.

| Property | Type | Description | Default |
|---|---|---|---|
| `default.font` | String | Font family name (e.g. `Merriweather`). | — |
| `default.font_set` | String | Font source: `GOOGLE`, `DEFAULT` | — |
| `default.size` | Number | Font size. | `12` |
| `default.size_unit` | String | `px`, `em`, `rem`, etc. | `px` |
| `default.color` | String | Hex colour. | `#000` |
| `default.styles` | Object | Bold, italic, underline options. | `{}` |
| `load_external_fonts` | Boolean | Set to `false` if loading the font elsewhere to avoid duplicates. | `true` |
| `variant` | String | Font weight/style variant (e.g. `700`, `400i`). | — |
| `limited_options` | Array | Restrict available fonts to a predefined list. | `undefined` |

> **Note:** `font` and `font_set` must both be present to load the font correctly.

```json
{
  "name": "heading_font",
  "label": "Heading Font",
  "type": "font",
  "load_external_fonts": true,
  "default": {
    "size": 24,
    "size_unit": "px",
    "font": "Merriweather",
    "font_set": "GOOGLE",
    "color": "#000000",
    "styles": {}
  }
}
```

---

### `form`

Lets editors select a HubSpot form to display on the page.

| Property | Type | Description |
|---|---|---|
| `default.response_type` | String | `inline` (show message) or `redirect` (go to URL). |
| `default.message` | String | Message shown after inline submission. |
| `default.redirect_url` | String | URL to redirect to after submission. |
| `disable_inline_form_editing` | Boolean | Hides inline form editing controls (fields, button text, CAPTCHA). |
| `required_property_types` | Array | Filter forms by property type: `CONTACT`, `COMPANY`, `TICKET`. |
| `embed_versions` | Array | `v2` (legacy forms) or `v4` (new editor forms). |

```json
{
  "name": "contact_form",
  "label": "Contact Form",
  "type": "form",
  "default": {
    "response_type": "inline",
    "message": "Thanks! We'll be in touch."
  }
}
```

---

### `gradient`

**Style field.** Linear gradient with up to 5 colour stops.
Exposes a `.css` property.

| Property | Type | Description |
|---|---|---|
| `default.colors` | Array | Array of colour stop objects with `r`, `g`, `b` (0–255) and `a` (0–1). Max 5 stops. |
| `default.side_or_corner` | Object | Gradient direction: `horizontalSide` (`LEFT`/`RIGHT`) and `verticalSide` (`TOP`/`BOTTOM`). |

```json
{
  "name": "hero_gradient",
  "label": "Hero Gradient",
  "type": "gradient",
  "default": {
    "colors": [
      { "color": { "r": 241, "g": 194, "b": 51, "a": 1 } },
      { "color": { "r": 230, "g": 145, "b": 56, "a": 1 } }
    ],
    "side_or_corner": { "horizontalSide": "LEFT", "verticalSide": null }
  }
}
```

---

### `hubdbrow`

Lets editors select a row (or rows) from a HubDB table.
**Content Hub Professional/Enterprise only.**

| Property | Type | Description | Default |
|---|---|---|---|
| `table_name_or_id` | String | HubDB table name or ID. Required. | — |
| `columns_to_fetch` | Array | Column names to fetch. Empty = all columns. | `[]` |
| `display_columns` | Array | Columns to show in the picker label. | `[]` |
| `display_format` | String | Format string for the picker (e.g. `%0 - %1`). | `""` |
| `default.id` | Integer | Default row ID. | `null` |

```json
{
  "name": "featured_row",
  "label": "Featured Item",
  "type": "hubdbrow",
  "table_name_or_id": "my_table",
  "columns_to_fetch": ["name", "price"],
  "display_columns": ["name"],
  "display_format": "%0",
  "default": { "id": null }
}
```

---

### `hubdbtable`

Lets editors select a HubDB table. Returns the table ID.
**Content Hub Professional/Enterprise only.**

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | HubDB table ID. | `null` |

```json
{
  "name": "data_table",
  "label": "Data Table",
  "type": "hubdbtable",
  "default": null
}
```

---

### `icon`

**Style field.** FontAwesome icon picker.

| Property | Type | Description | Default |
|---|---|---|---|
| `icon_set` | String | `fontawesome-6.4.2`, `fontawesome-5.14.0`, `fontawesome-5.0.10` | `fontawesome-5.0.10` |
| `default.name` | String | Icon name (e.g. `accessible-icon`). | — |
| `default.unicode` | String | Unicode value (e.g. `f368`). | — |
| `default.type` | String | `REGULAR`, `SOLID`, `LIGHT`, `BRANDS` | — |

```json
{
  "name": "icon_field",
  "label": "Icon",
  "type": "icon",
  "icon_set": "fontawesome-6.4.2",
  "default": {
    "name": "star",
    "unicode": "f005",
    "type": "SOLID"
  }
}
```

---

### `image`

**Style field** (when purely decorative). Standard image picker from File Manager.
For background images use `backgroundimage`. For logos use `logo`.

| Property | Type | Description | Default |
|---|---|---|---|
| `responsive` | Boolean | Responsive or fixed dimensions. | `true` |
| `resizable` | Boolean | Allow editors to resize. | `true` |
| `show_loading` | Boolean | Show lazy-load controls in editor. | `false` |
| `default.size_type` | String | `auto`, `auto_custom_max`, `exact` | `auto` |
| `default.src` | String | Default image URL (absolute path). | `""` |
| `default.alt` | String | Default alt text. | `null` |
| `default.loading` | String | `disabled`, `eager`, `lazy` | `disabled` |
| `default.width` / `height` | Number | Used when `size_type: exact`. | — |
| `default.max_width` / `max_height` | Number | Used when `size_type: auto_custom_max`. | — |

```json
{
  "name": "hero_image",
  "label": "Hero Image",
  "type": "image",
  "responsive": true,
  "resizable": true,
  "show_loading": true,
  "default": {
    "size_type": "auto",
    "src": "",
    "alt": "",
    "loading": "lazy"
  }
}
```

---

### `link`

Full link field with URL, open-in-new-tab, and rel attribute options.
More feature-rich than `url` — use this when editors need nofollow/sponsored options.

| Property | Type | Description | Default |
|---|---|---|---|
| `supported_types` | Array | `EXTERNAL`, `CONTENT`, `FILE`, `EMAIL_ADDRESS`, `BLOG`, `CALL_TO_ACTION`, `PHONE_NUMBER`, `WHATSAPP_NUMBER`, `PAYMENT` | All types |
| `show_advanced_rel_options` | Boolean | Enables `sponsored` and `user_generated_content` rel options. | `false` |
| `placeholder` | String | Placeholder text when no URL set. | — |
| `default.url.type` | String | Default link type. | `EXTERNAL` |
| `default.url.href` | String | Default URL. | `""` |
| `default.open_in_new_tab` | Boolean | — | `false` |
| `default.no_follow` | Boolean | — | `false` |

```json
{
  "name": "cta_link",
  "label": "CTA Link",
  "type": "link",
  "supported_types": ["EXTERNAL", "CONTENT"],
  "show_advanced_rel_options": false,
  "default": {
    "url": { "content_id": null, "type": "EXTERNAL", "href": "" },
    "open_in_new_tab": false,
    "no_follow": false
  }
}
```

---

### `logo`

Logo image picker that defaults to the domain's logo. Supports lazy loading.

| Property | Type | Description | Default |
|---|---|---|---|
| `show_loading` | Boolean | Show lazy-load controls in editor. | `false` |
| `default.override_inherited_src` | Boolean | Override inherited logo. | `false` |
| `default.src` | String | Logo URL. | `null` |
| `default.alt` | String | Alt text. | `null` |
| `default.loading` | String | `disabled`, `eager`, `lazy` | `disabled` |

```json
{
  "name": "site_logo",
  "label": "Logo",
  "type": "logo",
  "show_loading": true,
  "default": {
    "override_inherited_src": false,
    "src": null,
    "alt": null,
    "loading": "lazy"
  }
}
```

---

### `menu`

Lets editors select or create a reusable navigation menu (stored at account level).
For one-off, page-specific menus, use `simplemenu` instead.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Integer | Menu ID. `null` defaults to the account's default menu. | `null` |

```json
{
  "name": "main_nav",
  "label": "Main Navigation",
  "type": "menu",
  "default": null
}
```

---

### `number`

Numeric input for editors. Supports text input or slider display.

| Property | Type | Description | Default |
|---|---|---|---|
| `display` | String | `text` or `slider` | `text` |
| `min` | Number | Minimum allowed value. | — |
| `max` | Number | Maximum allowed value. | — |
| `step` | Number | Increment amount. | — |
| `prefix` | String | Display prefix (no effect on value). | — |
| `suffix` | String | Display suffix (no effect on value). | — |
| `placeholder` | String | Placeholder text. | — |
| `default` | Number | Default numeric value. | `null` |

```json
{
  "name": "column_count",
  "label": "Column Count",
  "type": "number",
  "display": "slider",
  "min": 1,
  "max": 6,
  "step": 1,
  "default": 3
}
```

---

### `page`

Lets editors select a HubSpot site or landing page. Returns the page ID.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Integer | Default page ID. | `null` |
| `placeholder` | String | Placeholder shown when no page selected. | — |

```json
{
  "name": "related_page",
  "label": "Related Page",
  "type": "page",
  "default": null
}
```

---

### `richtext`

WYSIWYG rich text editor. Outputs HTML. Use `text` when no formatting is needed.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | Default HTML content. Cannot use `get_asset_url`. | `""` |
| `enabled_features` | Array | Configure which toolbar options are available. | — |

```json
{
  "name": "body_copy",
  "label": "Body Copy",
  "type": "richtext",
  "default": "<p>Enter your content here.</p>"
}
```

---

### `simplemenu`

Page-specific navigation menu. Not reusable across pages.
Use `menu` for global/reusable menus.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Array of objects | JSON structure defining menu items and nested children. | `[]` |

Each menu item object contains: `linkLabel`, `linkUrl`, `linkTarget`, `type` (`URL_LINK` or `NO_LINK`), and `children` (array of child items).

```json
{
  "name": "toc_menu",
  "label": "Table of Contents",
  "type": "simplemenu",
  "default": [
    {
      "linkLabel": "Section One",
      "linkUrl": "#section-one",
      "linkTarget": null,
      "type": "URL_LINK",
      "children": []
    }
  ]
}
```

---

### `spacing`

**Style field.** Padding and margin controls with per-side options.
Exposes a `.css` property.

| Property | Type | Description | Default |
|---|---|---|---|
| `default.padding` | Object | Keys: `top`, `right`, `bottom`, `left`. Each has `value` and `units`. | — |
| `default.margin` | Object | Keys: `top`, `bottom`. Each has `value` and `units`. | — |
| `limits` | Object | Same shape as `default`. Sets `min`, `max`, and allowed `units` per side. | — |

**Supported units:** `px`, `pt`, `em`, `rem`, `%`, `vw`, `vh`, `Q`

```json
{
  "name": "section_spacing",
  "label": "Section Spacing",
  "type": "spacing",
  "default": {
    "padding": {
      "top": { "value": 48, "units": "px" },
      "bottom": { "value": 48, "units": "px" },
      "left": { "value": 24, "units": "px" },
      "right": { "value": 24, "units": "px" }
    },
    "margin": {
      "top": { "value": 0, "units": "px" },
      "bottom": { "value": 0, "units": "px" }
    }
  }
}
```

---

### `tag`

Lets editors select HubSpot blog tags to associate with content.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Array | Array of tag objects. | `[]` |
| `blog` | String / Integer | Limits tag selection to a specific blog (by ID or `"default"`). | — |

```json
{
  "name": "post_tags",
  "label": "Post Tags",
  "type": "tag",
  "blog": "default",
  "default": []
}
```

---

### `text`

Plain text input. No formatting. Use `richtext` when HTML/formatting is needed.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | String | Default text string. | `""` |
| `placeholder` | String | Placeholder text in editor. | — |
| `validation_regex` | String | Regex pattern to validate input. | — |
| `allow_new_line` | Boolean | If `true`, editors can add line breaks (multi-line text input). | `false` |
| `show_emoji_picker` | Boolean | Show emoji picker in editor. | `false` |

```json
{
  "name": "button_label",
  "label": "Button Label",
  "type": "text",
  "default": "Learn More",
  "placeholder": "Enter button text"
}
```

---

### `text_alignment`

**Style field.** Text-specific alignment control (horizontal only).
Use `alignment` for positioning elements within containers.

| Property | Type | Description | Default |
|---|---|---|---|
| `default.alignment` | String | `LEFT`, `CENTER`, `RIGHT`, `JUSTIFY` | — |

```json
{
  "name": "heading_alignment",
  "label": "Heading Alignment",
  "type": "text_alignment",
  "default": {
    "alignment": "LEFT"
  }
}
```

---

### `url`

Simple URL input. Similar to `link` but without rel attribute options.
Use `link` when nofollow/sponsored options are needed.

| Property | Type | Description | Default |
|---|---|---|---|
| `supported_types` | Array | `EXTERNAL`, `CONTENT`, `FILE`, `EMAIL_ADDRESS`, `BLOG` | All types |
| `default.type` | String | Default URL type. | `EXTERNAL` |
| `default.href` | String | Default URL. | `""` |
| `default.content_id` | Integer | HubSpot content ID (for internal links). | `null` |

```json
{
  "name": "page_url",
  "label": "Page URL",
  "type": "url",
  "supported_types": ["EXTERNAL", "CONTENT"],
  "default": {
    "content_id": null,
    "type": "EXTERNAL",
    "href": ""
  }
}
```

---

### `video`

HubSpot-hosted video picker. Returns video data for rendering.
For third-party embeds (YouTube, Vimeo), use `embed` instead.

| Property | Type | Description | Default |
|---|---|---|---|
| `default` | Object | Contains `player_id` and/or `conversion_asset`. | `{}` |
| `show_preview` | Boolean | Show video preview in editor. | `true` |

```json
{
  "name": "promo_video",
  "label": "Promo Video",
  "type": "videoplayer",
  "show_preview": true,
  "default": {}
}
```

---

## Quick Reference: Field Type Identifiers

| Field Name | `type` value | Modules | Themes | Style Field |
|---|---|:---:|:---:|:---:|
| Alignment | `alignment` | ✅ | | ✅ |
| Background Image | `backgroundimage` | ✅ | | ✅ |
| Blog | `blog` | ✅ | | |
| Boolean | `boolean` | ✅ | ✅ | ✅ |
| Border | `border` | ✅ | | ✅ |
| Choice | `choice` | ✅ | ✅ | ✅ |
| Color | `color` | ✅ | ✅ | ✅ |
| CTA | `cta` | ✅ | | |
| CRM Object | `crmobject` | ✅ | | |
| CRM Object Property | `crmobjectproperty` | ✅ | | |
| Date | `date` | ✅ | | |
| Date & Time | `datetime` | ✅ | | |
| Email Address | `email` | ✅ | | |
| Embed | `embed` | ✅ | | |
| File | `file` | ✅ | | |
| Followup Email ⚠️ | `followupemail` | ✅ | | |
| Font | `font` | ✅ | ✅ | ✅ |
| Form | `form` | ✅ | | |
| Gradient | `gradient` | ✅ | | ✅ |
| HubDB Row | `hubdbrow` | ✅ | | |
| HubDB Table | `hubdbtable` | ✅ | | |
| Icon | `icon` | ✅ | | ✅ |
| Image | `image` | ✅ | | ✅ |
| Link | `link` | ✅ | | |
| Logo | `logo` | ✅ | | |
| Menu | `menu` | ✅ | | |
| Number | `number` | ✅ | | ✅ |
| Page | `page` | ✅ | | |
| Rich Text | `richtext` | ✅ | | |
| Simple Menu | `simplemenu` | ✅ | | |
| Spacing | `spacing` | ✅ | | ✅ |
| Tag | `tag` | ✅ | | |
| Text | `text` | ✅ | ✅ | |
| Text Alignment | `text_alignment` | ✅ | | ✅ |
| URL | `url` | ✅ | | |
| Video | `videoplayer` | ✅ | | |

---

*Source: [HubSpot Developer Docs — Module and Theme Fields](https://developers.hubspot.com/docs/cms/reference/fields/module-theme-fields)*
