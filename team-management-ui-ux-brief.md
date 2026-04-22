# ShopSynch — UI/UX Design Brief: Permissions, Roles & Team Member Management

> **Scope:** Role management, permission assignment, and team member management screens inside the merchant dashboard.
> **Placement:** All screens live under **General Settings** — added as new tabs alongside Profile, Compliance, API Keys, Store Settings, and Email Settings.
> **Dashboard:** Nuxt 3 app at `/Users/harmlessprince/webprojects/shopsync/merchant-dashboard` running on port `3007`.
> **Design baseline:** Desktop-first (existing app convention). Responsive behaviour added on top.

---

## 1. Goals

| Goal | Description |
|---|---|
| **Access control** | Store owner can invite staff, assign roles, and revoke access without support |
| **Role clarity** | Users see at a glance what each role can and cannot do |
| **Self-service** | Invitees accept via email link — no pre-existing account required |
| **Minimal disruption** | New screens slot into the existing General Settings tab pattern with zero changes to existing tabs |

---

## 2. Where It Lives — Information Architecture

Team management plugs into the **existing General Settings section** at `/dashboard/general-settings/`.

### Updated Settings Tabs

```
General Settings
├── Profile          (existing)
├── Compliance       (existing)
├── API Keys         (existing)
├── Store Settings   (existing)
├── Email Settings   (existing)
├── Team Members     ← NEW
└── Roles            ← NEW
```

**Routing (Nuxt file-based):**

```
pages/dashboard/general-settings/
├── profile.vue                        (existing)
├── business_details.vue               (existing)
├── compliance.vue                     (existing)
├── api-keys.vue                       (existing)
├── store-settings/                    (existing)
├── email/                             (existing)
├── team-members.vue                   ← NEW (main member list)
└── roles/
    ├── index.vue                      ← NEW (role list)
    └── [id].vue                       ← NEW (role detail / edit)
```

---

## 3. Layout & Shell Pattern

All new screens follow the **exact same shell as existing settings pages**:

```
┌──────────────────────────────────────────────────────────────┐
│  [ShopSynch Logo]   Dashboard  Products  Orders  Settings    │  ← Top nav
├──────────────────────────────────────────────────────────────┤
│  [Profile] [Compliance] [API Keys] [Store Settings] [Email]  │
│  [Team Members] [Roles]                                      │  ← SettingsTabs (horizontal)
├─────────────────┬────────────────────────────────────────────┤
│                 │                                            │
│  Left sidebar   │  Page content area                        │
│  (sub-links     │                                            │
│   when needed)  │                                            │
│                 │                                            │
└─────────────────┴────────────────────────────────────────────┘
```

- `DashboardSettingsTabs` — horizontal tab bar (add `Team Members` + `Roles` entries)
- Left sidebar — used only when a tab has sub-pages (Team Members has none; Roles may show a sub-link per role type)
- Content area — grows to fill remaining width

---

## 4. Screen Specifications

### 4.1 Team Members Screen (`/dashboard/general-settings/team-members`)

**Purpose:** View all active members and pending invitations. Invite new members or remove existing ones.

#### Desktop Layout (baseline)

```
┌───────────────────────────────────────────────────────────────────┐
│  Team Members                               [+ Invite Member]     │
├───────────────────────────────────────────────────────────────────┤
│  ACTIVE MEMBERS                                                   │
│                                                                   │
│  Name               Email                  Role          Action   │
│  ─────────────────────────────────────────────────────────────── │
│  Ada Okonkwo        ada@example.com         Store Manager   [···] │
│  Emeka Nwosu        emeka@example.com       Viewer          [···] │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  PENDING INVITATIONS                                              │
│                                                                   │
│  Email                    Role            Expires       Action   │
│  ─────────────────────────────────────────────────────────────── │
│  chidi@gmail.com          Store Manager   15 Apr 2026    [···]   │
└───────────────────────────────────────────────────────────────────┘
```

#### Overflow Menu (`[···]`) — Active Member
- **Change Role** → opens role picker modal
- **Remove from Store** → opens confirmation modal

#### Overflow Menu (`[···]`) — Pending Invitation
- **Resend Invite**
- **Cancel Invite** → opens confirmation modal

#### Empty State (no members, no invitations)
- Icon: `group` (Material Symbols Outlined)
- Heading: "No team members yet"
- Body: "Invite team members to delegate tasks and manage your store together."
- CTA button: "Invite your first team member"

#### Responsive (mobile)
- Table collapses to card list (one card per member/invitation)
- Each card shows name/email, role badge, status chip, and overflow menu
- `[+ Invite Member]` becomes a full-width button pinned above the list

---

### 4.2 Invite Member Modal

Opened via `[+ Invite Member]` button. Uses **Vue Final Modal** (same as existing modals in the app).

```
┌─────────────────────────────────────────────────────┐
│  Invite Team Member                            [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Email address *                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ e.g. ada@example.com                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Assign role *                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Select a role                          [▼]  │   │
│  └─────────────────────────────────────────────┘   │
│  ℹ  Store Managers can process orders, manage       │
│     products and view reports. They cannot          │
│     manage team or billing.                         │
│                                                     │
│  [Cancel]                   [Send Invitation]       │
└─────────────────────────────────────────────────────┘
```

- **Role hint** updates when role selection changes — shows a one-line summary of what the role can do
- On success: toast via `useToastStore().success("Invitation sent to ada@example.com")` + pending invitation row added to table
- On failure (already member / already invited): inline field error below the email input, not a toast
- Validation via VeeValidate + Zod schema (`schemas/teamSchema.ts`)

**Validation rules:**

| Field | Rule |
|---|---|
| Email | Required, valid email |
| Role | Required |

---

### 4.3 Change Role Modal

Opened from overflow menu of an active member.

```
┌─────────────────────────────────────────────────────┐
│  Change Role — Ada Okonkwo                     [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Current role: Store Manager                        │
│                                                     │
│  New role *                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Viewer                                 [▼]  │   │
│  └─────────────────────────────────────────────┘   │
│  ℹ  Viewers have read-only access to orders,        │
│     products, and reports.                          │
│                                                     │
│  [Cancel]                        [Update Role]      │
└─────────────────────────────────────────────────────┘
```

On success: row updates optimistically, toast "Role updated for Ada Okonkwo."

---

### 4.4 Remove Member Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│  Remove Ada Okonkwo?                           [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  She will immediately lose access to this store.    │
│  This action cannot be undone.                      │
│                                                     │
│  [Cancel]                     [Remove Member]       │   ← red button
└─────────────────────────────────────────────────────┘
```

---

### 4.5 Roles Screen (`/dashboard/general-settings/roles`)

**Purpose:** View built-in roles and manage custom roles.

#### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Roles                                          [+ Create Role]  │
├──────────────────────────────────────────────────────────────────┤
│  BUILT-IN ROLES                                                  │
│                                                                  │
│  Role              Description                Members  Action    │
│  ──────────────────────────────────────────────────────────────  │
│  🔒 Super Admin    Full access to everything   1        [View]   │
│  🔒 Store Manager  Orders, products, reports   2        [View]   │
│  🔒 Viewer         Read-only across store      1        [View]   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  CUSTOM ROLES (2)                                                │
│                                                                  │
│  Role              Description                Members  Action    │
│  ──────────────────────────────────────────────────────────────  │
│  Warehouse Staff   Manage stock levels         3       [Edit]    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **Built-in roles** show a lock icon (`lock` — Material Symbols Outlined) and only a `[View]` action — no edit/delete
- **Custom roles** show `[Edit]` and `[Delete]` actions
- `[Delete]` on a role that has active members: show inline error or confirmation with warning ("3 members will lose their roles")
- `[+ Create Role]` → opens **Create Role modal**

#### Responsive (mobile)
- Table collapses to card list
- Each card: role name, lock/custom badge, member count, action buttons

---

### 4.6 Role Detail (Read-Only) — Built-in Roles

Opened via `[View]` on a built-in role. Uses Vue Final Modal.

```
┌─────────────────────────────────────────────────────┐
│  Store Manager                                 [✕]  │
│  Built-in role · Read-only                          │
├─────────────────────────────────────────────────────┤
│  PERMISSIONS                                        │
│                                                     │
│  Orders                                             │
│    ✅  View orders                                  │
│    ✅  Process / update orders                      │
│    ❌  Delete orders                                │
│    ❌  Export orders                                │
│                                                     │
│  Products                                           │
│    ✅  View products                                │
│    ✅  Create products                              │
│    ✅  Edit products                                │
│    ❌  Delete products                              │
│                                                     │
│  Team                                               │
│    ❌  All team permissions                         │
│                                                     │
│  Settings                                           │
│    ❌  All settings permissions                     │
│                                                     │
│                                        [Close]      │
└─────────────────────────────────────────────────────┘
```

---

### 4.7 Create / Edit Role Modal

**Purpose:** Build a custom role by naming it and selecting permissions from grouped checklists.

```
┌──────────────────────────────────────────────────────────────────┐
│  Create Role                                               [✕]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Role name *                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ e.g. Warehouse Staff                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Description (optional)                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  PERMISSIONS                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Orders                          [Select all] 2 of 4 ▼  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  ☑  View orders                                    │  │   │
│  │  │  ☑  Process / update orders                        │  │   │
│  │  │  ☐  Delete orders                                  │  │   │
│  │  │  ☐  Export orders                                  │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  Products                        [Select all] 3 of 4 ▼  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  ☑  View products                                  │  │   │
│  │  │  ☑  Create products                                │  │   │
│  │  │  ☑  Edit products                                  │  │   │
│  │  │  ☐  Delete products                                │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  Inventory                       [Select all] 0 of 3 ▼  │   │
│  │  Team                            [Select all] 0 of 4 ▼  │   │
│  │  Reports                         [Select all] 0 of 2 ▼  │   │
│  │  Settings                        [Select all] 0 of 2 ▼  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Cancel]                                   [Save Role]         │
└──────────────────────────────────────────────────────────────────┘
```

**UX Details:**
- Permission groups are **collapsible accordions** — expanded by default on desktop, collapsed on mobile
- `[Select all]` toggle at group level checks/unchecks all permissions in the group
- Counter `X of Y` in group header is always visible even when collapsed
- At least 1 permission must be selected before Save is enabled
- On success: toast "Role 'Warehouse Staff' created", row added to custom roles table
- **Edit mode** — same modal, title changes to "Edit Role", fields pre-filled, action button says "Update Role"

**Permission categories and display names** (maps to `AppPermission` enum values on the backend):

| Category | Permissions |
|---|---|
| **Orders** | View orders, Process/update orders, Delete orders, Export orders |
| **Products** | View products, Create products, Edit products, Delete products |
| **Inventory** | View inventory, Update stock levels, Manage warehouses |
| **Team** | View team members, Invite team members, Remove team members, Assign roles |
| **Reports** | View reports, Export reports |
| **Settings** | Manage store settings, Manage billing |

**Validation:**

| Field | Rule |
|---|---|
| Role name | Required, 2–50 characters, unique within tenant |
| Permissions | At least 1 selected |

---

### 4.8 Delete Role Confirmation Modal

```
┌─────────────────────────────────────────────────────┐
│  Delete "Warehouse Staff"?                     [✕]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠  3 team members currently have this role.       │
│     They will have no role after deletion.          │
│                                                     │
│  This action cannot be undone.                      │
│                                                     │
│  [Cancel]                    [Delete Role]          │   ← red button
└─────────────────────────────────────────────────────┘
```

If role has zero members — no warning paragraph shown.

---

## 5. Invitation Acceptance Flow (Public — No Auth)

The accepting user clicks a link in their email. This is a **separate public page** outside the dashboard layout:

```
pages/invitations/accept.vue    ← ?token=xxxx
```

### Landing State

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            [ShopSynch Logo]                      │
│                                                  │
│  You've been invited to join                     │
│  Mama's Kitchen Store                            │
│                                                  │
│  Role assigned: Store Manager                    │
│  Invited by: owner@mamaskt.com                   │
│  Expires: 15 April 2026                          │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Already have an account?                        │
│  [  Log in to Accept  ]                          │
│                                                  │
│  New to ShopSynch?                               │
│  [  Create Account & Accept  ]                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Post-Acceptance State

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ✅                                              │
│                                                  │
│  You've joined Mama's Kitchen!                   │
│                                                  │
│  You've been assigned the role                   │
│  Store Manager.                                  │
│                                                  │
│  [  Go to Dashboard  ]                           │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Error States

| Scenario | Message shown on page |
|---|---|
| Token not found | "This invitation link is invalid or has already been used." |
| Invitation expired | "This invitation expired on 15 Apr 2026. Ask the store owner to send a new one." |
| Invitation cancelled | "This invitation is no longer valid. Contact the store owner." |
| Already a member | "You're already a member of this store. Go to dashboard." |
| Wrong email logged in | "This invitation was sent to a different email address. Log in with the correct account." |

---

## 6. Responsive Behaviour Summary

| Element | Desktop (≥ 1280px) | Tablet (768–1279px) | Mobile (< 768px) |
|---|---|---|---|
| Team Members table | Full table with all columns | Condensed table, drop "Joined" column | Card list per member |
| Roles table | Full table | Condensed table | Card list per role |
| Invite button | Top-right of section header | Top-right of section header | Full-width button above list |
| Modals | Centered overlay (max-width 560px) | Centered overlay | Bottom sheet |
| Permission builder accordions | Expanded by default | Expanded by default | Collapsed by default |
| Settings tabs | Horizontal scrollable tab bar | Horizontal scrollable tab bar | Dropdown or scrollable tab bar |

---

## 7. Notification & Feedback Patterns

All toasts use the existing `useToastStore()` — no new toast system.

| Event | Feedback type | Message |
|---|---|---|
| Invitation sent | `success` toast | "Invitation sent to ada@example.com" |
| Role updated | `success` toast | "Role updated for Ada Okonkwo" |
| Member removed | `success` toast | "Ada Okonkwo has been removed" |
| Invitation cancelled | `success` toast | "Invitation cancelled" |
| Custom role created | `success` toast | "Role 'Warehouse Staff' created" |
| Custom role updated | `success` toast | "Role 'Warehouse Staff' updated" |
| Custom role deleted | `success` toast | "Role deleted" |
| Already a member / already invited | Inline field error | Shown below the email field in Invite modal |
| Permission denied (403) | Handled by fetch-interceptor | Auto-shown error toast |
| Validation error (422) | Handled by fetch-interceptor | Field-level errors shown by VeeValidate |

---

## 8. Component Plan

New components to create (follow `PascalCase` naming and place under `components/Dashboard/`):

| Component | Purpose |
|---|---|
| `DashboardTeamMembersTable.vue` | Renders the active members table / card list |
| `DashboardPendingInvitationsTable.vue` | Renders pending invitations table / card list |
| `DashboardRolesTable.vue` | Renders the roles list (built-in + custom) |
| `DashboardPermissionBuilder.vue` | Accordion permission group checklist (used in Create/Edit Role modal) |
| `DashboardRoleBadge.vue` | Compact coloured badge displaying a role name |

Modals (place under `components/Modals/`):

| Modal | Purpose |
|---|---|
| `InviteMemberModal.vue` | Invite form |
| `ChangeRoleModal.vue` | Role picker for existing member |
| `RemoveMemberModal.vue` | Confirm removal |
| `ViewRoleModal.vue` | Read-only permission list for built-in roles |
| `CreateEditRoleModal.vue` | Create or edit a custom role |
| `DeleteRoleModal.vue` | Confirm role deletion |

---

## 9. Store & Endpoint Plan

**New store:** `stores/team.store.js`

```javascript
// Methods to expose:
fetchMembers(tenantId)          // GET /v1/tenants/:tenantId/members
inviteUser(tenantId, payload)   // POST /v1/tenants/:tenantId/invite
updateMemberRole(tenantId, userId, payload) // PATCH /v1/tenants/:tenantId/members/:userId/roles
removeMember(tenantId, userId)  // DELETE /v1/tenants/:tenantId/members/:userId
fetchInvitations(tenantId)      // GET /v1/tenants/:tenantId}/invitations
cancelInvitation(invitationId)  // DELETE /v1/invitations/:invitationId

fetchRoles(tenantId)            // GET /v1/tenants/:tenantId/roles
createRole(tenantId, payload)   // POST /v1/tenants/:tenantId/roles
updateRole(tenantId, roleId, payload) // PATCH /v1/tenants/:tenantId/roles/:roleId
deleteRole(tenantId, roleId)    // DELETE /v1/tenants/:tenantId/roles/:roleId
```

**New endpoints in `utils/endpoints.js`:**

```javascript
team: {
  members:        "/v1/tenants/:tenantId/members",
  inviteUser:     "/v1/tenants/:tenantId/invite",
  updateMember:   "/v1/tenants/:tenantId/members/:userId/roles",
  removeMember:   "/v1/tenants/:tenantId/members/:userId",
  invitations:    "/v1/tenants/:tenantId/invitations",
  cancelInvite:   "/v1/invitations/:invitationId",
  roles:          "/v1/tenants/:tenantId/roles",
  roleById:       "/v1/tenants/:tenantId/roles/:roleId",
}
```

**New validation schema:** `schemas/teamSchema.ts`

```typescript
// inviteMemberSchema — email (required, valid email), roleId (required)
// createRoleSchema   — name (required, 2-50 chars), permissionIds (min 1)
```

---

## 10. Access Control (What the UI Must Gate)

The merchant dashboard must check the current user's permissions before showing actions. If permission is missing, the action button is hidden or disabled — the backend also enforces this, but the UI should not surface actions the user cannot perform.

| UI action | Required permission |
|---|---|
| See team members list | `can_read_team_member` |
| Invite member button visible | `can_invite_team_member` |
| Cancel invitation visible | `can_invite_team_member` (or original inviter) |
| Remove member visible | `can_remove_team_member` |
| Change member role visible | `can_assign_role` |
| Create / edit / delete custom roles | `can_manage_settings` (or a dedicated role permission TBD) |

Store owners (users whose `tenantId` matches the store) always have full access — no gating needed for them.

---

## 11. Out of Scope (v1)

- Audit log / activity history per member
- 2FA enforcement per role
- Bulk CSV invite
- Time-limited role assignments
- Role templates / cloning
- IP allowlisting per role
