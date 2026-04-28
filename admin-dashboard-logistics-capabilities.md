# Admin Dashboard Logistics Capability Management

## Summary

The admin dashboard needs a logistics capability management screen where platform admins configure how each logistics provider operates. These settings are global per provider and are consumed by the merchant dashboard and quote flow.

Admins should be able to define whether a provider is active, whether it picks up from merchant stores, whether merchants must drop parcels at a provider center, whether it supports doorstep delivery, and what geographic coverage it supports.

## User Stories

### 1. View provider capability profiles

**As an admin**, I want to see all logistics provider capability profiles so that I can understand which providers are available and how they operate.

**Acceptance criteria**

- Admin can view all provider capability profiles.
- Each provider row/card shows provider code, active status, handoff mode, delivery coverage, and merchant instructions.
- Inactive providers are clearly marked.
- Missing capability profiles should be created by backend defaults when requested.

### 2. Configure provider availability

**As an admin**, I want to activate or deactivate a logistics provider so that merchants only use providers that are ready on the platform.

**Acceptance criteria**

- Admin can toggle `active`.
- Inactive providers should remain visible to admins.
- Merchant dashboard should not allow merchants to enable inactive providers.
- Quote generation should skip inactive providers.

### 3. Configure merchant handoff behavior

**As an admin**, I want to configure whether a provider picks up from merchant stores or requires merchant drop-off so that merchant setup forms ask for the right information.

**Acceptance criteria**

- `supportsMerchantPickup=true` means merchants must provide origin state and origin LGA when enabling the provider.
- `requiresDropOffLocation=true` means merchants must select a provider drop-off/pickup location when enabling the provider.
- A provider may support merchant pickup, require drop-off, both, or neither depending on the provider.
- Konga should use `supportsMerchantPickup=false` and `requiresDropOffLocation=true`.

### 4. Configure delivery capabilities

**As an admin**, I want to configure doorstep, interstate, and international support so that merchants understand provider limitations.

**Acceptance criteria**

- Admin can toggle `supportsDoorstepDelivery`.
- Admin can toggle `supportsInterstateDelivery`.
- Admin can toggle `supportsInternationalDelivery`.
- If international delivery is enabled, admin must provide `internationalCountries`.

### 5. Configure coverage type

**As an admin**, I want to configure provider coverage as worldwide, regional, nationwide, or selected states so that quote filtering uses the correct service area.

**Acceptance criteria**

- Admin can choose one `coverageType`.
- Supported values:
  - `WORLDWIDE`
  - `AFRICA`
  - `WEST_AFRICA`
  - `EAST_AFRICA`
  - `EUROPE`
  - `NATIONWIDE`
  - `SELECTED_STATES`
- `WORLDWIDE` does not require `supportedCountries` or `supportedStates`.
- Regional coverage types should use `supportedCountries`.
- `NATIONWIDE` should use `supportedCountries`, usually one country such as `Nigeria`.
- `SELECTED_STATES` requires `supportedStates`.

### 6. Provide merchant-facing instructions

**As an admin**, I want to define instructions shown to merchants so that provider-specific rules are explained clearly.

**Acceptance criteria**

- Admin can edit `merchantInstructions`.
- Merchant dashboard displays `merchantInstructions` prominently.
- Instructions should be written for merchants, not developers.

## Admin Dashboard Changes

### Provider capabilities list

Create a logistics provider capability page under admin logistics.

Recommended table columns:

| Column | Source field |
| --- | --- |
| Provider | `provider` |
| Status | `active` |
| Pickup from merchant | `supportsMerchantPickup` |
| Drop-off required | `requiresDropOffLocation` |
| Doorstep delivery | `supportsDoorstepDelivery` |
| Interstate | `supportsInterstateDelivery` |
| International | `supportsInternationalDelivery` |
| Coverage | `coverageType` |
| Countries | `supportedCountries` |
| States | `supportedStates` |
| Last updated | `updatedAt` if exposed later |

### Provider capability edit form

The edit form should include:

- Active toggle.
- Supports merchant pickup toggle.
- Requires drop-off location toggle.
- Supports doorstep delivery toggle.
- Supports interstate delivery toggle.
- Supports international delivery toggle.
- Coverage type select.
- Supported countries multi-select/tag input.
- International countries multi-select/tag input.
- Supported states multi-select/tag input.
- Merchant instructions textarea.
- Metadata JSON editor or advanced field, hidden by default.

### Coverage form behavior

| Coverage type | Required fields | UI behavior |
| --- | --- | --- |
| `WORLDWIDE` | None | Hide or disable countries/states as required fields. |
| `AFRICA` | `supportedCountries` | Show countries input. States optional. |
| `WEST_AFRICA` | `supportedCountries` | Show countries input. States optional. |
| `EAST_AFRICA` | `supportedCountries` | Show countries input. States optional. |
| `EUROPE` | `supportedCountries` | Show countries input. States optional. |
| `NATIONWIDE` | `supportedCountries` | Show countries input. Usually one country. States optional. |
| `SELECTED_STATES` | `supportedCountries`, `supportedStates` | Show countries and states inputs. States required. |

### Konga recommended admin configuration

Konga should be configured as:

```json
{
  "active": true,
  "supportsMerchantPickup": false,
  "requiresDropOffLocation": true,
  "supportsDoorstepDelivery": true,
  "supportsInternationalDelivery": false,
  "internationalCountries": [],
  "supportsInterstateDelivery": true,
  "coverageType": "SELECTED_STATES",
  "supportedCountries": ["Nigeria"],
  "supportedStates": ["Lagos", "Oyo", "Rivers"],
  "merchantInstructions": "Konga does not pick up items from your store. You must drop shipments at a Konga center.",
  "metadata": {
    "locationSelectionMode": "STATE_LGA_LOCATION"
  }
}
```

Konga admin notes:

- Konga has provider-specific APIs for states, LGAs, and locations.
- Merchant dashboard uses those endpoints to let merchants select a drop-off center.
- Admin capability config should not store every Konga location.
- Admin config should define Konga’s operating rules and coverage only.

## API Endpoints

### List all provider capabilities

```http
GET /v1/admin/logistics/providers/capabilities
```

#### Response example

```json
{
  "success": true,
  "message": "Logistic provider capabilities retrieved successfully",
  "data": [
    {
      "id": "capability-id",
      "provider": "KONGA",
      "active": true,
      "supportsMerchantPickup": false,
      "requiresDropOffLocation": true,
      "supportsDoorstepDelivery": true,
      "supportsInternationalDelivery": false,
      "internationalCountries": [],
      "supportsInterstateDelivery": true,
      "coverageType": "SELECTED_STATES",
      "supportedCountries": ["Nigeria"],
      "supportedStates": ["Lagos", "Oyo", "Rivers"],
      "merchantInstructions": "Konga does not pick up items from your store. You must drop shipments at a Konga center.",
      "metadata": {
        "locationSelectionMode": "STATE_LGA_LOCATION"
      }
    }
  ]
}
```

### Get provider capability

```http
GET /v1/admin/logistics/providers/capabilities/{provider}
```

Example:

```http
GET /v1/admin/logistics/providers/capabilities/KONGA
```

#### Response example

```json
{
  "success": true,
  "message": "Logistic provider capability retrieved successfully",
  "data": {
    "id": "capability-id",
    "provider": "KONGA",
    "active": true,
    "supportsMerchantPickup": false,
    "requiresDropOffLocation": true,
    "supportsDoorstepDelivery": true,
    "supportsInternationalDelivery": false,
    "internationalCountries": [],
    "supportsInterstateDelivery": true,
    "coverageType": "SELECTED_STATES",
    "supportedCountries": ["Nigeria"],
    "supportedStates": ["Lagos", "Oyo", "Rivers"],
    "merchantInstructions": "Konga does not pick up items from your store. You must drop shipments at a Konga center.",
    "metadata": {
      "locationSelectionMode": "STATE_LGA_LOCATION"
    }
  }
}
```

### Update provider capability

```http
PUT /v1/admin/logistics/providers/capabilities/{provider}
Content-Type: application/json
```

#### Konga request example

```json
{
  "active": true,
  "supportsMerchantPickup": false,
  "requiresDropOffLocation": true,
  "supportsDoorstepDelivery": true,
  "supportsInternationalDelivery": false,
  "internationalCountries": [],
  "supportsInterstateDelivery": true,
  "coverageType": "SELECTED_STATES",
  "supportedCountries": ["Nigeria"],
  "supportedStates": ["Lagos", "Oyo", "Rivers"],
  "merchantInstructions": "Konga does not pick up items from your store. You must drop shipments at a Konga center.",
  "metadata": {
    "locationSelectionMode": "STATE_LGA_LOCATION"
  }
}
```

#### Response example

```json
{
  "success": true,
  "message": "Logistic provider capability updated successfully",
  "data": {
    "id": "capability-id",
    "provider": "KONGA",
    "active": true,
    "supportsMerchantPickup": false,
    "requiresDropOffLocation": true,
    "supportsDoorstepDelivery": true,
    "supportsInternationalDelivery": false,
    "internationalCountries": [],
    "supportsInterstateDelivery": true,
    "coverageType": "SELECTED_STATES",
    "supportedCountries": ["Nigeria"],
    "supportedStates": ["Lagos", "Oyo", "Rivers"],
    "merchantInstructions": "Konga does not pick up items from your store. You must drop shipments at a Konga center.",
    "metadata": {
      "locationSelectionMode": "STATE_LGA_LOCATION"
    }
  }
}
```

#### Worldwide request example

```json
{
  "active": true,
  "supportsMerchantPickup": true,
  "requiresDropOffLocation": false,
  "supportsDoorstepDelivery": true,
  "supportsInternationalDelivery": true,
  "internationalCountries": [],
  "supportsInterstateDelivery": true,
  "coverageType": "WORLDWIDE",
  "supportedCountries": [],
  "supportedStates": [],
  "merchantInstructions": "This provider supports worldwide door-to-door delivery.",
  "metadata": null
}
```

#### West Africa request example

```json
{
  "active": true,
  "supportsMerchantPickup": true,
  "requiresDropOffLocation": false,
  "supportsDoorstepDelivery": true,
  "supportsInternationalDelivery": true,
  "internationalCountries": ["Ghana", "Benin", "Togo"],
  "supportsInterstateDelivery": true,
  "coverageType": "WEST_AFRICA",
  "supportedCountries": ["Nigeria", "Ghana", "Benin", "Togo"],
  "supportedStates": [],
  "merchantInstructions": "This provider supports selected West African countries.",
  "metadata": null
}
```

## Validation And Error Handling

### Missing coverage type

```json
{
  "success": false,
  "message": "coverageType is required"
}
```

### Selected states without states

```json
{
  "success": false,
  "message": "Supported states are required when coverage type is selected states"
}
```

### Non-worldwide coverage without countries

```json
{
  "success": false,
  "message": "Supported countries are required"
}
```

### International delivery without international countries

```json
{
  "success": false,
  "message": "International countries are required when international delivery is supported"
}
```

## Admin UX Rules

- Warn admins that changes affect merchant dashboard configuration and checkout quote availability.
- Show a confirmation modal before deactivating an active provider.
- Show a confirmation modal before removing supported countries or states from a provider with existing usage.
- Keep provider code read-only; admins update the profile for an existing provider, not the provider identifier.
- Treat `metadata` as advanced provider-specific configuration.
- Prefer readable merchant-facing instructions over internal field names.

## Frontend Implementation Checklist

- Add admin logistics capability API client.
- Add provider capabilities list page.
- Add provider capability edit page/modal.
- Implement coverage-type conditional validation.
- Implement toggles for active, pickup, drop-off, doorstep, interstate, and international support.
- Add country/state tag inputs.
- Add merchant instructions textarea.
- Add advanced metadata JSON editor.
- Add Konga preset defaults or helper copy.
- Add UI tests for Konga, worldwide, regional, nationwide, and selected-state configurations.

