# Product Template API — Frontend Integration Guide

**Base URL:** `/v2/product-templates`  
**Auth:** All write operations (`POST`, `PUT`, `DELETE`) require a merchant JWT (the `@MerchantAccess` guard). Read operations are open to authenticated users.

---

## Overview

A **Product Template** defines the attribute schema for a product category. It drives two UIs:

1. **Merchant Dashboard** — dynamic form fields shown when creating/editing a product.
2. **Storefront** — spec table, filter panel, and variant selectors shown to customers.

### Two Template Tiers

| Tier | `tenantId` | Who creates it |
|---|---|---|
| System default | `null` | Platform admin (seeded at startup) |
| Tenant override | merchant's tenant ID | Merchant via dashboard |

**Resolution order:** tenant override → system default.  
If no template exists for a category, the product creation form shows no extra attribute fields.

### Is it compulsory for a merchant to create a template?

**No.** System defaults are pre-populated for standard categories at platform startup. The merchant does not need to do anything — the `by-category/{categoryId}` endpoint automatically returns the system default when no tenant override exists.

A merchant only creates (or overrides) a template when they want to:
- Add attributes the system default does not include
- Remove, reorder, or relabel attributes for their store
- Change which attributes drive variant groups or filter facets

You can tell which tier a returned template belongs to by inspecting `tenantId`:
- `tenantId: null` → system default (pre-populated, no merchant action required)
- `tenantId: "<id>"` → merchant's own override

---

## Data Models

### `ProductTemplateResponse`

```json
{
  "id": "string",
  "name": "string",
  "categoryId": "string",
  "tenantId": "string | null",
  "productTypes": ["SIMPLE", "VARIABLE", "DIGITAL", "BUNDLE"],
  "attributeDefinitions": [ /* AttributeDefinitionResponse[] */ ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### `AttributeDefinitionResponse`

```json
{
  "key": "string",
  "label": "string",
  "type": "STRING | NUMBER | BOOLEAN | ENUM | MULTI_ENUM | COLOR",
  "options": ["string"],
  "unit": "string | null",
  "required": false,
  "isVariantDimension": false,
  "isFilterable": false,
  "displayAs": "TEXT | BADGE | COLOR_SWATCH | SIZE_CHART | SPEC_TABLE_ROW | HIDDEN",
  "section": "string | null",
  "displayOrder": 0,
  "placeholder": "string | null"
}
```

### `AttributeType` Enum

| Value | Description | Dashboard input |
|---|---|---|
| `STRING` | Free text | Text input |
| `NUMBER` | Numeric, may have `unit` | Number input + unit suffix |
| `BOOLEAN` | Yes / No | Toggle / Checkbox |
| `ENUM` | Single choice from `options` | Dropdown or radio group |
| `MULTI_ENUM` | Multiple choices from `options` | Multi-select or checkbox group |
| `COLOR` | Hex colour code | Colour picker |

### `DisplayAs` Enum

| Value | Storefront rendering | Dashboard rendering |
|---|---|---|
| `TEXT` | Plain "Label: value" line | Text input |
| `BADGE` | Pill / chip badge | Text input |
| `COLOR_SWATCH` | Coloured dot grid for variant selection | Colour picker |
| `SIZE_CHART` | Button grid + optional size-chart link | Dropdown or radio |
| `SPEC_TABLE_ROW` | Row in structured spec table | Any input |
| `HIDDEN` | Not shown on storefront | Internal field, visible only in admin |

### `ProductType` Enum

`SIMPLE` · `VARIABLE` · `DIGITAL` · `BUNDLE`

> If `productTypes` is an **empty array** the template applies to **all** product types.

---

## API Endpoints

### 1. List Templates

```
GET /v2/product-templates
```

**Query params (all optional):**

| Param | Type | Description |
|---|---|---|
| `categoryId` | string | Filter by category ID |
| `tenantId` | string | Filter by tenant ID |
| `systemOnly` | boolean (default `false`) | Return only system defaults |

**Response `200`:**

```json
{
  "status": "success",
  "message": "Templates retrieved",
  "data": [ /* ProductTemplateResponse[] */ ]
}
```

---

### 2. Get Effective Template for a Category

```
GET /v2/product-templates/by-category/{categoryId}
```

> Use this as the **primary endpoint** during product creation. Pass the tenant-category ID. The API resolves tenant override → system default automatically.

**Path param:** `categoryId` — the `TenantCategory.id` (not the raw system category ID).

**Response `200`:**

```json
{
  "status": "success",
  "message": "Template retrieved",
  "data": { /* ProductTemplateResponse */ }
}
```

**Response `404`:**

```json
{
  "status": "error",
  "message": "No product template configured for this category"
}
```

> When 404, render the product form with only the core fields (name, price, stock). Do not block the user.

---

### 3. Get Template by ID

```
GET /v2/product-templates/{id}
```

**Response `200`:** `ProductTemplateResponse`

---

### 4. Create Template

```
POST /v2/product-templates
Authorization: Bearer <merchant-jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "Smartphones",
  "categoryId": "tenant-category-id-here",
  "tenantId": "optional — auto-set from JWT if omitted",
  "productTypes": ["SIMPLE", "VARIABLE"],
  "attributeDefinitions": [
    {
      "key": "ram_size",
      "label": "RAM Size",
      "type": "ENUM",
      "options": ["4GB", "8GB", "16GB", "32GB"],
      "unit": "",
      "required": true,
      "isVariantDimension": true,
      "isFilterable": true,
      "displayAs": "BADGE",
      "section": "Performance",
      "displayOrder": 1,
      "placeholder": "Select RAM size"
    },
    {
      "key": "color",
      "label": "Color",
      "type": "COLOR",
      "options": [],
      "required": true,
      "isVariantDimension": true,
      "isFilterable": true,
      "displayAs": "COLOR_SWATCH",
      "section": "Appearance",
      "displayOrder": 2,
      "placeholder": null
    },
    {
      "key": "screen_size",
      "label": "Screen Size",
      "type": "NUMBER",
      "unit": "inches",
      "required": false,
      "isVariantDimension": false,
      "isFilterable": true,
      "displayAs": "SPEC_TABLE_ROW",
      "section": "Display",
      "displayOrder": 3,
      "placeholder": "e.g. 6.1"
    }
  ]
}
```

> **Note:** `tenantId` is optional in the request body. If omitted, the backend resolves it from the JWT. Do not expose the raw `tenantId` field to end users.

**Validation rules:**

- `name` — required, non-blank
- `categoryId` — required, must be a valid `TenantCategory.id` belonging to the current tenant
- `attributeDefinitions` — at least one item required
- Each attribute: `key` and `label` are required; `type` is required
- For `ENUM` / `MULTI_ENUM`: `options` must not be empty

**Error `400` — duplicate template:**

```json
{
  "message": "A template already exists for this tenant and category combination."
}
```

---

### 5. Update Template

```
PUT /v2/product-templates/{id}
Authorization: Bearer <merchant-jwt>
Content-Type: application/json
```

Body is identical to create. Full replacement — send the **complete** `attributeDefinitions` array.

**Response `200`:** `ProductTemplateResponse`

---

### 6. Delete Template

```
DELETE /v2/product-templates/{id}
Authorization: Bearer <merchant-jwt>
```

**Response `200`:**

```json
{
  "status": "success",
  "message": "Template deleted",
  "data": null
}
```

---

## Standard Response Envelope

All endpoints return:

```json
{
  "status": "success" | "error",
  "message": "string",
  "data": { } | [ ] | null
}
```

---

## UI Components & Rendering Guide

### Dashboard — Template Builder (Settings > Categories > Templates)

A CRUD form for merchants to manage their template overrides.

**Template form fields:**

| Field | UI input | Notes |
|---|---|---|
| Template name | Text input | e.g. "Smartphones" |
| Category | Category picker / dropdown | Select from merchant's categories |
| Product types | Multi-checkbox | SIMPLE, VARIABLE, DIGITAL, BUNDLE; leave all unchecked = applies to all |
| Attribute definitions | Dynamic list (add / remove / reorder) | See attribute row spec below |

**Attribute row (inside template builder):**

Each row in the attribute list has:
- `key` — text input (machine key, no spaces)
- `label` — text input (human label)
- `type` — dropdown (`STRING`, `NUMBER`, `BOOLEAN`, `ENUM`, `MULTI_ENUM`, `COLOR`)
- `options` — tag/chip input, visible only when `type` is `ENUM` or `MULTI_ENUM`
- `unit` — text input, visible only when `type` is `NUMBER`
- `required` — toggle
- `isVariantDimension` — toggle (only relevant for VARIABLE products)
- `isFilterable` — toggle
- `displayAs` — dropdown
- `section` — text input (group header, e.g. "Display", "Performance")
- `displayOrder` — number input (lower = appears first)
- `placeholder` — text input

---

### Dashboard — Product Create / Edit Form

On the product creation page, after the merchant selects a category:

1. Call `GET /v2/product-templates/by-category/{categoryId}`
2. If `200`: render the dynamic attribute fields from `attributeDefinitions` sorted by `displayOrder`, grouped by `section`.
3. If `404`: render no extra fields (core fields only — name, price, stock, etc.).

**Rendering rules per `AttributeType`:**

| `type` | `displayAs` | Render as |
|---|---|---|
| `STRING` | any | Single-line text input |
| `NUMBER` | any | Number input; append `unit` as suffix label if present |
| `BOOLEAN` | any | Toggle switch or checkbox |
| `ENUM` | `BADGE` | Radio button group (pill style) |
| `ENUM` | `SIZE_CHART` | Button grid |
| `ENUM` | other | Dropdown `<select>` |
| `MULTI_ENUM` | any | Multi-select checkbox group |
| `COLOR` | `COLOR_SWATCH` | Colour picker (hex); show swatch preview |
| `COLOR` | other | Hex text input |

**Section grouping:**

Attributes with the same `section` value are rendered under a collapsible group header. Attributes where `section` is null/empty are rendered in an "Other" group at the bottom (or ungrouped).

**Variant dimensions:**

Attributes where `isVariantDimension: true` AND the product type is `VARIABLE` drive the variant group builder. Surface these as a separate "Variant Attributes" section at the top of the attributes panel.

---

### Storefront — Product Detail Page

Use `attributeDefinitions` to render the spec table and variant selectors.

**Per `displayAs` value:**

| `displayAs` | Storefront component |
|---|---|
| `TEXT` | Key–value row: "Screen Size: 6.1 inches" |
| `BADGE` | Pill/chip: labelled badge per value |
| `COLOR_SWATCH` | Coloured dot grid for variant selection |
| `SIZE_CHART` | Clickable button grid; optional "Size guide" link |
| `SPEC_TABLE_ROW` | Row in a structured `<table>` (label + value + unit) |
| `HIDDEN` | Do not render |

**Spec table construction:**

1. Filter `attributeDefinitions` where `displayAs === "SPEC_TABLE_ROW"` and the product has a value for that `key`.
2. Group rows by `section`.
3. Sort rows by `displayOrder` within each section.

**Filter panel (category/search page):**

Use attributes where `isFilterable: true` to build dynamic filter facets. The facet type follows `AttributeType`:
- `ENUM` / `MULTI_ENUM` → checkbox list
- `NUMBER` → range slider (use min/max of actual product values)
- `BOOLEAN` → toggle
- `COLOR` → colour swatch grid

---

## Acceptance Scenarios

### Scenario 1 — Merchant creates a template for Smartphones

**Steps:**
1. Merchant navigates to **Settings > Categories**.
2. Selects the "Smartphones" category.
3. Clicks **"Add Template"**.
4. Fills in template name, selects `SIMPLE` and `VARIABLE` product types.
5. Adds attributes: `ram_size` (ENUM, variant dimension), `color` (COLOR, variant dimension), `screen_size` (NUMBER, spec table row).
6. Clicks **Save**.

**Expected result:**
- `POST /v2/product-templates` returns `200` with the new template.
- Template appears in the category's template list.
- Next time a product is created under "Smartphones", the dynamic form shows these attribute fields.

---

### Scenario 2 — Merchant creates a product using the template

**Steps:**
1. Merchant opens **Products > Add Product**.
2. Selects category "Smartphones".
3. Frontend calls `GET /v2/product-templates/by-category/{categoryId}`.
4. Dynamic form renders the attribute fields from the template, grouped by section.
5. Merchant fills in all `required` attributes; optional ones may be skipped.
6. For a `VARIABLE` product, `isVariantDimension: true` attributes (e.g. `ram_size`, `color`) are used to build variant groups.
7. Merchant submits the product form.

**Expected result:**
- Product is saved with `attributes` map containing the keys defined in the template.
- Missing required attributes are caught by client-side validation before submit.

---

### Scenario 3 — Category has no template

**Steps:**
1. Merchant selects a custom category (one they created, not a system category).
2. Frontend calls `GET /v2/product-templates/by-category/{categoryId}`.
3. API returns `404`.

**Expected result:**
- No dynamic attribute fields are shown.
- Core product fields (name, description, price, stock) remain fully functional.
- No error toast or blocking modal — this is a normal state.

---

### Scenario 4 — Merchant updates an existing template

**Steps:**
1. Merchant navigates to the template for "Smartphones".
2. Adds a new attribute `battery_capacity` (NUMBER, unit "mAh", `SPEC_TABLE_ROW`).
3. Clicks **Save**.

**Expected result:**
- `PUT /v2/product-templates/{id}` returns `200` with updated template.
- Existing products are not affected (attributes are stored per-product, not derived live).
- New products created under "Smartphones" now include the `battery_capacity` field.

---

### Scenario 5 — Merchant deletes a template

**Steps:**
1. Merchant navigates to the template for "Running Shoes".
2. Clicks **Delete** and confirms.

**Expected result:**
- `DELETE /v2/product-templates/{id}` returns `200`.
- New products created under "Running Shoes" fall back to the system default template, or show no extra fields if no system default exists.
- Existing products are unaffected.

---

### Scenario 6 — Storefront renders spec table

**Steps:**
1. Customer opens a product detail page for a Smartphone.
2. Storefront fetches the product data (which includes stored `attributes`).
3. Frontend uses the template (fetched once and cached per category) to determine rendering.

**Expected result:**
- `SPEC_TABLE_ROW` attributes appear in a structured spec table, grouped by `section`.
- `COLOR_SWATCH` attributes drive the variant colour selector grid.
- `SIZE_CHART` attributes drive the size selector button grid.
- `HIDDEN` attributes are not rendered anywhere.
- Attributes without a value stored on the product are omitted from the table.

---

## Recommended Frontend Caching

| Data | Strategy |
|---|---|
| `GET /v2/product-templates/by-category/{id}` | Cache per `categoryId` for the session; invalidate on template update. |
| `GET /v2/product-templates` | Cache for the admin settings page; invalidate on create/update/delete. |
| Enum / type constants | Hard-code — `AttributeType` and `DisplayAs` values are stable. |
