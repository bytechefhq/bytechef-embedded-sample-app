# Custom Workflow Builder — Design Spec

- **Date:** 2026-06-13
- **Repo:** `bytechef-samples/bytechef-embedded-sample-app` (`front-end`, Next.js App Router)
- **Branch:** `workflow-builder-demo`
- **Status:** Approved (brainstorming)

## 1. Purpose

Demonstrate how a SaaS that embeds ByteChef can build its **own** workflow-builder UI
on top of the embedded public REST API, without using ByteChef's native workflow editor.

The reference is [useparagon/workflow-builder-demo](https://github.com/useparagon/workflow-builder-demo):
a simple, linear step-list builder. This demo intentionally stays "basic" — its value is
teaching the integration contract, not feature breadth.

The builder produces a valid ByteChef **workflow-definition JSON string**, saves it via the
`createFrontendProjectWorkflow` endpoint, then binds connections to the component nodes via
`updateFrontendWorkflowConfigurationConnection`.

Two components are exercised — **Gmail** (`googleMail` v1) and **Slack** (`slack` v1) — each with
one trigger and a small set of actions, plus a **Condition** (`condition/v1`) with nested branches.

## 2. Scope decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Builder UX shape | Linear vertical step list (no graph library) |
| Step configuration | Hardcoded minimal field catalog (no dynamic definition fetch) |
| JSON preview | Yes — side-by-side live read-only preview |
| Connections | Select existing connection per component + bind after save (no inline ConnectDialog in v1) |

Out of scope for v1: dynamic property forms, options lookups, creating connections inline via
`useConnectDialog`, multi-condition AND/OR groups, loops/other task dispatchers, editing an
existing saved workflow (builder always creates a new one).

## 3. Key facts about the ByteChef contract

- **Create endpoint:** `POST /api/embedded/v1/automation/workflows` with body `{ "definition": "<json string>" }`.
  Derives the user from the bearer token. Returns the new `workflowUuid` (plain text, possibly quoted).
  Backed by `ConnectedUserProjectWorkflowApiController.createFrontendProjectWorkflow`.
- **List connections for a component:** `GET /api/embedded/v1/components/{componentName}/connections`
  → `[{ id, name, environment? }]` (`ConnectionModel`).
- **Bind a connection to a node:**
  `PUT /api/embedded/v1/automation/workflows/{workflowUuid}/workflow-nodes/{workflowNodeName}/connection/{workflowConnectionKey}`
  with body `{ "connectionId": <id> }`. `workflowConnectionKey` = the component name for these single-connection components.
  (HTTP method to be confirmed against the generated `ConnectedUserProjectWorkflowApi` at implementation time; controller method is `updateFrontendWorkflowConfigurationConnection`.)
- **Definition shape:**
  ```jsonc
  {
    "label": "...",
    "description": "...",
    "triggers": [
      { "name": "trigger_1", "label": "...", "type": "googleMail/v1/newEmail", "parameters": {} }
    ],
    "tasks": [
      { "name": "googleMail_1", "label": "...", "type": "googleMail/v1/sendEmail", "parameters": { "to": "...", "subject": "...", "body": "..." } },
      {
        "name": "condition_1",
        "label": "...",
        "type": "condition/v1",
        "parameters": {
          "rawExpression": false,
          "conditions": [[ { "type": "string", "value1": "...", "operation": "EQUALS", "value2": "..." } ]],
          "caseTrue":  [ /* nested tasks */ ],
          "caseFalse": [ /* nested tasks */ ]
        }
      }
    ]
  }
  ```
  Note: `conditions` is a **list of lists** (outer = OR groups, inner = AND); v1 emits a single
  group with a single comparison.

### Component catalog (hardcoded)

**Gmail** (`googleMail`, v1)
- Trigger: `newEmail` — "New Email" (no fields)
- Actions:
  - `sendEmail` — "Send Email": `to` (string), `subject` (string), `body` (string)
  - `getEmail` — "Get Email": `id` (string)
  - `searchEmail` — "Search Email": `q` (string)

**Slack** (`slack`, v1)
- Trigger: `anyEvent` — "Any Event" (no fields)
- Actions:
  - `sendChannelMessage` — "Send Channel Message": `channel` (string), `text` (string)
  - `sendDirectMessage` — "Send Direct Message": `userId` (string), `text` (string)
  - `addReaction` — "Add Reaction": `channel` (string), `timestamp` (string), `reaction` (string)

(Field sets are intentionally minimal/illustrative; the demo's point is the builder→definition
mapping, not exhaustive parameter coverage. Exact parameter key names verified against component
actions during implementation.)

Condition operations: `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `EMPTY`, `NOT_EMPTY` (string type).

## 4. Builder model

```ts
type ComponentName = 'googleMail' | 'slack';

interface FieldValue { [key: string]: string }

interface TriggerState {
  componentName: ComponentName;
  operation: string;          // trigger operation name, e.g. 'newEmail'
  parameters: FieldValue;
  connectionId?: number;      // selected existing connection
}

interface ActionStep {
  kind: 'action';
  id: string;                 // client-side stable id
  componentName: ComponentName;
  operation: string;
  parameters: FieldValue;
  connectionId?: number;
}

interface ConditionStep {
  kind: 'condition';
  id: string;
  value1: string;
  operation: string;          // EQUALS, ...
  value2: string;
  caseTrue: ActionStep[];     // nested actions only (no nested conditions in v1)
  caseFalse: ActionStep[];
}

type Step = ActionStep | ConditionStep;

interface BuilderState {
  label: string;
  description: string;
  trigger?: TriggerState;
  steps: Step[];
}
```

Node-name generation (deterministic, the contract connection-binding depends on):
- trigger → `trigger_1`
- top-level component task → `<componentName>_<n>` where `n` increments per component across the
  whole definition (including nested), so names are globally unique.
- condition → `condition_<n>`.

## 5. UI layout

Two-column page at `/builder`:
- **Left (builder):** label/description form → Trigger card → vertical step stack with `+` add
  buttons (Add Action / Add Condition) between cards. Condition cards render two nested drop zones
  ("If true" / "If false"), each its own mini step stack with its own Add Action button. Each card
  has a remove button. Component/operation selection via `Select`/`DropdownMenu`; fields via `Input`.
  Connection-requiring cards render a `ConnectionPicker` (dropdown of existing connections, loaded
  lazily per component).
- **Right (preview):** live read-only pretty-printed JSON of `buildWorkflowDefinition(state)`.
- **Footer:** Save button + inline error/success banners; on success, a link to `/automations/{uuid}`.

Reuses existing shadcn primitives (`Card`, `Button`, `Input`, `Label`, `DropdownMenu`,
`Select` if present — otherwise `DropdownMenu`). Matches the visual style of `automations/page.tsx`.

## 6. Files

| File | Responsibility |
|---|---|
| `src/app/builder/page.tsx` | Page shell, `BuilderState` via `useState`, save orchestration, two-column layout |
| `src/app/builder/catalog.ts` | Hardcoded component/trigger/action/field catalog + condition operations |
| `src/app/builder/definition.ts` | `buildWorkflowDefinition(state): string` — pure, unit-testable; node-name assignment |
| `src/app/builder/components/trigger-card.tsx` | Trigger component/operation + fields + connection picker |
| `src/app/builder/components/action-step.tsx` | Action component/operation + fields + connection picker |
| `src/app/builder/components/condition-step.tsx` | Comparison row + nested true/false action lists |
| `src/app/builder/components/connection-picker.tsx` | Lazy-loads + selects an existing connection for a component |
| `src/app/builder/components/json-preview.tsx` | Pretty-printed read-only definition |
| `src/lib/api.ts` | `createBuilderWorkflow`, `fetchComponentConnections`, `bindWorkflowNodeConnection` |
| `src/app/layout.tsx` | Add "Workflow Builder" nav item (e.g. `WorkflowIcon`/`Wand2Icon`) |

## 7. Save flow

1. **Validate:** trigger present; required fields non-empty (per catalog). Show inline errors.
2. **Create:** `createBuilderWorkflow(buildWorkflowDefinition(state))` → `workflowUuid`.
3. **Bind connections:** for each component node (trigger + every action) that has a selected
   `connectionId`, call `bindWorkflowNodeConnection(workflowUuid, nodeName, componentName, connectionId)`.
   Failures here are surfaced but non-fatal (workflow already created).
4. **Done:** success banner + link to `/automations/{workflowUuid}`.

## 8. API additions (`src/lib/api.ts`)

```ts
export interface ComponentConnection { id: number; name: string }

export async function createBuilderWorkflow(definition: string): Promise<string>;        // POST /automation/workflows -> uuid (unquoted)
export async function fetchComponentConnections(componentName: string): Promise<ComponentConnection[]>; // GET /components/{name}/connections
export async function bindWorkflowNodeConnection(
  workflowUuid: string, workflowNodeName: string, workflowConnectionKey: string, connectionId: number
): Promise<Response>;                                                                     // PUT .../workflow-nodes/{node}/connection/{key}
```

All go through the existing `fetchWithAuth` (bearer token + `X-ENVIRONMENT`).

## 9. Testing

- `definition.ts` is pure → small set of assertions (trigger-only, action, condition with both
  branches, node-name uniqueness) runnable in isolation. (The sample app has no test runner
  configured; if added, place beside the module. Otherwise rely on the live JSON preview as the
  manual verification surface.)
- Manual: build a Gmail-trigger → Condition → Slack-action flow, confirm preview JSON matches the
  contract, Save, and verify the workflow appears on `/automations`.

## 10. Educational framing

Inline comments in `definition.ts` and `api.ts` explain the contract: the only ByteChef-specific
knowledge a custom builder needs is (1) the definition JSON shape and (2) three REST calls. The
builder's catalog is deliberately the app's own — showing that the embedding app controls its UX
entirely while ByteChef executes the resulting workflow.
