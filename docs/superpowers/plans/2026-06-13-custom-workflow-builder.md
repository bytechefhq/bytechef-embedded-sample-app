# Custom Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/builder` page to the embedded sample app that lets a user assemble a Gmail/Slack/Condition workflow in a linear step list, see the live ByteChef workflow-definition JSON, save it, and bind connections — demonstrating how to build a custom workflow builder on the embedded public API.

**Architecture:** A client-side React (Next.js App Router) page holds a `BuilderState` in `useState`. A hardcoded **catalog** describes the two components, their operations, and minimal fields. A pure **`buildWorkflowDefinition`** function serializes state to the ByteChef definition JSON. Three new functions in `lib/api.ts` (over the existing `fetchWithAuth`) create the workflow and bind connections. Verification is via the live JSON preview (the app has no test runner; we keep it dependency-free).

**Tech Stack:** Next.js 16 (App Router, client components), React 19, TypeScript, TailwindCSS, existing shadcn-style UI primitives (`Card`, `Button`, `Input`, `Label`), native `<select>` for pickers.

---

## Conventions for this repo

- Work inside `front-end/`. The app's import alias is `@/` → `front-end/src/`.
- Follow the existing style: `cn` from `@/lib/utils` (this app uses `cn`, unlike the main bytechef client), `'use client'` at the top of interactive files, 2-space indent, double quotes in TSX (matching `automations/page.tsx`).
- There is **no test runner and no `Select` primitive**. Use native styled `<select>`. Verify behavior by running `npm run dev` and reading the live JSON preview against the exact expected JSON shown in each task.
- After every task: `cd front-end && npm run lint` must pass, then commit.
- Commit message convention: `<short description>` (no ticket number for this sample repo). End with the Co-Authored-By trailer.

---

## File structure

| File | Responsibility |
|---|---|
| `front-end/src/lib/api.ts` (modify) | Add `createBuilderWorkflow`, `fetchComponentConnections`, `bindWorkflowNodeConnection`, and `ComponentConnection` type |
| `front-end/src/app/builder/catalog.ts` (create) | Hardcoded component/trigger/action/field catalog + condition operations + types |
| `front-end/src/app/builder/definition.ts` (create) | Pure `buildWorkflowDefinition(state)` + `BuilderState` types + node-name assignment |
| `front-end/src/app/builder/components/json-preview.tsx` (create) | Read-only pretty-printed definition |
| `front-end/src/app/builder/components/field-inputs.tsx` (create) | Renders catalog fields (string / stringArray) into inputs |
| `front-end/src/app/builder/components/connection-picker.tsx` (create) | Lazy-loads + selects an existing connection for a component |
| `front-end/src/app/builder/components/trigger-card.tsx` (create) | Trigger component/operation + fields + connection picker |
| `front-end/src/app/builder/components/action-step.tsx` (create) | Action component/operation + fields + connection picker |
| `front-end/src/app/builder/components/condition-step.tsx` (create) | Comparison row + nested true/false action lists |
| `front-end/src/app/builder/page.tsx` (create) | Page shell, state, save orchestration, two-column layout |
| `front-end/src/app/layout.tsx` (modify) | Add "Workflow Builder" nav item |

---

## Task 1: API layer additions

**Files:**
- Modify: `front-end/src/lib/api.ts`

- [ ] **Step 1: Add the `ComponentConnection` type and three functions**

Add this type next to the other interfaces near the top of `api.ts` (after the `Workflow` interfaces):

```ts
// A connection the user already created for a given component, returned by
// GET /api/embedded/v1/components/{componentName}/connections
export interface ComponentConnection {
  id: number;
  name: string;
}
```

Add these three exported functions (place them after `generateWorkflow`, before `getToken`). They reuse the existing `fetchWithAuth` helper and the same "unquote plain-text response" pattern already used by `copyWorkflowTemplate`:

```ts
/**
 * Create a workflow from a raw ByteChef workflow-definition JSON string.
 *
 * This is the single call a custom builder needs to persist a workflow: the
 * embedded endpoint derives the user from the bearer token and returns the new
 * workflow's uuid. Backed by ConnectedUserProjectWorkflowApiController.createFrontendProjectWorkflow.
 *
 * @param definition A complete workflow-definition JSON string (see buildWorkflowDefinition)
 * @returns the new workflowUuid
 */
export async function createBuilderWorkflow(definition: string): Promise<string> {
  const response = await fetchWithAuth('/api/embedded/v1/automation/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({definition})
  });

  if (!response.ok) {
    throw new Error(`Failed to create workflow: ${response.status}`);
  }

  const workflowUuid = (await response.text()).trim();

  return workflowUuid.startsWith('"') && workflowUuid.endsWith('"')
    ? workflowUuid.slice(1, -1)
    : workflowUuid;
}

/**
 * List the connections the current user already has for a given component
 * (e.g. "googleMail", "slack").
 *
 * @param componentName the ByteChef component name
 * @returns the user's existing connections for that component
 */
export async function fetchComponentConnections(componentName: string): Promise<ComponentConnection[]> {
  const response = await fetchWithAuth(`/api/embedded/v1/components/${componentName}/connections`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch connections for ${componentName}: ${response.status}`);
  }

  return response.json();
}

/**
 * Bind an existing connection to a specific node of a saved workflow.
 *
 * The workflowConnectionKey is the connection key within the node; for the
 * single-connection components used here it equals the component name.
 * Backed by ConnectedUserProjectWorkflowApiController.updateFrontendWorkflowConfigurationConnection (HTTP PUT).
 *
 * @param workflowUuid uuid returned by createBuilderWorkflow
 * @param workflowNodeName the node's name in the definition (e.g. "trigger_1", "slack_1")
 * @param workflowConnectionKey the connection key (component name here)
 * @param connectionId the connection to bind
 */
export async function bindWorkflowNodeConnection(
  workflowUuid: string,
  workflowNodeName: string,
  workflowConnectionKey: string,
  connectionId: number
): Promise<Response> {
  return fetchWithAuth(
    `/api/embedded/v1/automation/workflows/${workflowUuid}/workflow-nodes/${workflowNodeName}/connection/${workflowConnectionKey}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({connectionId})
    }
  );
}
```

- [ ] **Step 2: Lint**

Run: `cd front-end && npm run lint`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
cd front-end && git add src/lib/api.ts
git commit -m "Add builder workflow create + connection API helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Component catalog

**Files:**
- Create: `front-end/src/app/builder/catalog.ts`

- [ ] **Step 1: Create the catalog**

This is the app's *own* description of what it offers — the only place operations/fields are
declared. Field keys and `stringArray`/hidden defaults were verified against the real ByteChef
component definitions (Gmail `to` is an array; body needs `bodyType`; Slack reaction uses `name`).

```ts
// The custom builder's own catalog of components, operations, and fields.
// This is intentionally hardcoded and minimal — the demo's point is that the
// embedding app owns its UX; ByteChef only needs the resulting definition.

export type ComponentName = 'googleMail' | 'slack';

// How a field is captured in the UI and serialized into the definition parameters.
export type FieldKind =
  | 'string'        // a plain text input -> string value
  | 'stringArray'   // comma-separated text input -> string[] value
  | 'hidden';       // not shown; emitted as a fixed default (e.g. bodyType=TEXT)

export interface CatalogField {
  key: string;          // the parameter key in the workflow definition
  label: string;        // UI label
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string; // for 'hidden' fields, the constant value to emit
}

export interface CatalogOperation {
  name: string;         // operation name, e.g. "sendEmail"
  label: string;        // UI label, e.g. "Send Email"
  fields: CatalogField[];
}

export interface CatalogComponent {
  name: ComponentName;
  label: string;
  triggers: CatalogOperation[];
  actions: CatalogOperation[];
}

export const COMPONENTS: CatalogComponent[] = [
  {
    name: 'googleMail',
    label: 'Gmail',
    triggers: [
      {name: 'newEmail', label: 'New Email', fields: []}
    ],
    actions: [
      {
        name: 'sendEmail',
        label: 'Send Email',
        fields: [
          {key: 'to', label: 'To (comma-separated)', kind: 'stringArray', required: true, placeholder: 'alice@example.com, bob@example.com'},
          {key: 'subject', label: 'Subject', kind: 'string', required: true, placeholder: 'Hello'},
          {key: 'bodyType', label: '', kind: 'hidden', defaultValue: 'TEXT'},
          {key: 'body', label: 'Body', kind: 'string', required: true, placeholder: 'Message body'}
        ]
      },
      {
        name: 'getEmail',
        label: 'Get Email',
        fields: [
          {key: 'id', label: 'Message ID', kind: 'string', required: true, placeholder: '18ab...'}
        ]
      },
      {
        name: 'searchEmail',
        label: 'Search Email',
        fields: [
          {key: 'from', label: 'From', kind: 'string', required: false, placeholder: 'sender@example.com'},
          {key: 'subject', label: 'Subject contains', kind: 'string', required: false, placeholder: 'invoice'}
        ]
      }
    ]
  },
  {
    name: 'slack',
    label: 'Slack',
    triggers: [
      {name: 'anyEvent', label: 'Any Event', fields: []}
    ],
    actions: [
      {
        name: 'sendChannelMessage',
        label: 'Send Channel Message',
        fields: [
          {key: 'channel', label: 'Channel ID', kind: 'string', required: true, placeholder: 'C0123456789'},
          {key: 'text', label: 'Message', kind: 'string', required: true, placeholder: 'Hello, team!'}
        ]
      },
      {
        name: 'sendDirectMessage',
        label: 'Send Direct Message',
        fields: [
          {key: 'channel', label: 'User ID', kind: 'string', required: true, placeholder: 'U0123456789'},
          {key: 'text', label: 'Message', kind: 'string', required: true, placeholder: 'Hi there!'}
        ]
      },
      {
        name: 'addReaction',
        label: 'Add Reaction',
        fields: [
          {key: 'channel', label: 'Channel ID', kind: 'string', required: true, placeholder: 'C0123456789'},
          {key: 'timestamp', label: 'Message Timestamp', kind: 'string', required: true, placeholder: '1234567890.123456'},
          {key: 'name', label: 'Emoji Name', kind: 'string', required: true, placeholder: 'thumbsup'}
        ]
      }
    ]
  }
];

// String comparison operations supported by the condition/v1 task dispatcher.
export const CONDITION_OPERATIONS: {value: string; label: string}[] = [
  {value: 'EQUALS', label: 'equals'},
  {value: 'NOT_EQUALS', label: 'does not equal'},
  {value: 'CONTAINS', label: 'contains'},
  {value: 'EMPTY', label: 'is empty'},
  {value: 'NOT_EMPTY', label: 'is not empty'}
];

// Lookup helpers.
export function findComponent(name: ComponentName): CatalogComponent {
  const component = COMPONENTS.find((candidate) => candidate.name === name);

  if (!component) {
    throw new Error(`Unknown component: ${name}`);
  }

  return component;
}

export function findOperation(
  component: CatalogComponent,
  operationName: string,
  group: 'triggers' | 'actions'
): CatalogOperation | undefined {
  return component[group].find((operation) => operation.name === operationName);
}
```

- [ ] **Step 2: Lint**

Run: `cd front-end && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd front-end && git add src/app/builder/catalog.ts
git commit -m "Add workflow builder component catalog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Definition builder (pure)

**Files:**
- Create: `front-end/src/app/builder/definition.ts`

- [ ] **Step 1: Create the builder state types and `buildWorkflowDefinition`**

```ts
import {
  CONDITION_OPERATIONS,
  ComponentName,
  findComponent,
  findOperation
} from './catalog';

// ----- Builder state (held by the page in useState) -----

export interface FieldValues {
  [key: string]: string;
}

export interface TriggerState {
  componentName: ComponentName;
  operation: string;          // trigger operation name, e.g. "newEmail"
  parameters: FieldValues;    // raw string values keyed by field key
  connectionId?: number;
}

export interface ActionStepState {
  kind: 'action';
  id: string;                 // client-side stable id
  componentName: ComponentName;
  operation: string;
  parameters: FieldValues;
  connectionId?: number;
}

export interface ConditionStepState {
  kind: 'condition';
  id: string;
  value1: string;
  operation: string;          // EQUALS, NOT_EQUALS, ...
  value2: string;
  caseTrue: ActionStepState[];
  caseFalse: ActionStepState[];
}

export type StepState = ActionStepState | ConditionStepState;

export interface BuilderState {
  label: string;
  description: string;
  trigger?: TriggerState;
  steps: StepState[];
}

// ----- Definition shape (what ByteChef expects) -----

interface DefinitionNode {
  name: string;
  label: string;
  type: string;
  parameters: Record<string, unknown>;
}

interface ConditionParameters {
  rawExpression: boolean;
  conditions: Array<Array<Record<string, unknown>>>;
  caseTrue: DefinitionNode[];
  caseFalse: DefinitionNode[];
}

interface WorkflowDefinition {
  label: string;
  description: string;
  triggers: DefinitionNode[];
  tasks: DefinitionNode[];
}

// A small mutable counter so component node names are globally unique across
// top-level tasks and nested condition branches (e.g. slack_1, slack_2).
class NameCounter {
  private counts: Record<string, number> = {};

  next(prefix: string): string {
    this.counts[prefix] = (this.counts[prefix] ?? 0) + 1;

    return `${prefix}_${this.counts[prefix]}`;
  }
}

// Serialize a single action's raw string parameters into typed definition parameters.
function buildActionParameters(componentName: ComponentName, operation: string, values: FieldValues): Record<string, unknown> {
  const component = findComponent(componentName);
  const catalogOperation = findOperation(component, operation, 'actions');
  const parameters: Record<string, unknown> = {};

  if (!catalogOperation) {
    return parameters;
  }

  for (const field of catalogOperation.fields) {
    if (field.kind === 'hidden') {
      parameters[field.key] = field.defaultValue ?? '';

      continue;
    }

    const raw = values[field.key] ?? '';

    if (raw.trim() === '') {
      continue;
    }

    if (field.kind === 'stringArray') {
      parameters[field.key] = raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '');
    } else {
      parameters[field.key] = raw;
    }
  }

  return parameters;
}

function buildActionNode(step: ActionStepState, counter: NameCounter): DefinitionNode {
  const component = findComponent(step.componentName);
  const catalogOperation = findOperation(component, step.operation, 'actions');

  return {
    name: counter.next(step.componentName),
    label: catalogOperation ? catalogOperation.label : step.operation,
    type: `${step.componentName}/v1/${step.operation}`,
    parameters: buildActionParameters(step.componentName, step.operation, step.parameters)
  };
}

function buildConditionNode(step: ConditionStepState, counter: NameCounter): DefinitionNode {
  // EMPTY / NOT_EMPTY only need a single operand; the others compare value1 to value2.
  const comparison: Record<string, unknown> = {
    type: 'string',
    value1: step.value1,
    operation: step.operation
  };

  if (step.operation !== 'EMPTY' && step.operation !== 'NOT_EMPTY') {
    comparison.value2 = step.value2;
  }

  const parameters: ConditionParameters = {
    rawExpression: false,
    conditions: [[comparison]],
    caseTrue: step.caseTrue.map((action) => buildActionNode(action, counter)),
    caseFalse: step.caseFalse.map((action) => buildActionNode(action, counter))
  };

  return {
    name: counter.next('condition'),
    label: 'Condition',
    type: 'condition/v1',
    parameters: parameters as unknown as Record<string, unknown>
  };
}

function buildTriggerNode(trigger: TriggerState): DefinitionNode {
  const component = findComponent(trigger.componentName);
  const catalogOperation = findOperation(component, trigger.operation, 'triggers');

  return {
    name: 'trigger_1',
    label: catalogOperation ? catalogOperation.label : trigger.operation,
    type: `${trigger.componentName}/v1/${trigger.operation}`,
    parameters: {}
  };
}

/**
 * Convert builder state into a ByteChef workflow-definition JSON string.
 * Pure: no I/O, deterministic node names.
 */
export function buildWorkflowDefinition(state: BuilderState): string {
  const counter = new NameCounter();

  const tasks: DefinitionNode[] = state.steps.map((step) =>
    step.kind === 'action' ? buildActionNode(step, counter) : buildConditionNode(step, counter)
  );

  const definition: WorkflowDefinition = {
    label: state.label,
    description: state.description,
    triggers: state.trigger ? [buildTriggerNode(state.trigger)] : [],
    tasks
  };

  return JSON.stringify(definition, null, 2);
}

// A flat list of (componentName, nodeName, connectionId) for every component
// node that has a selected connection — used by the save flow to bind connections.
export interface NodeConnectionBinding {
  componentName: ComponentName;
  nodeName: string;
  connectionId: number;
}

/**
 * Recompute node names exactly as buildWorkflowDefinition does, and collect the
 * connection bindings the user selected. Kept in sync with buildWorkflowDefinition
 * by using the same NameCounter ordering (trigger first, then steps in order,
 * with condition branches consuming names inline).
 */
export function collectConnectionBindings(state: BuilderState): NodeConnectionBinding[] {
  const counter = new NameCounter();
  const bindings: NodeConnectionBinding[] = [];

  if (state.trigger) {
    // trigger always uses the fixed name "trigger_1" (no counter)
    if (state.trigger.connectionId != null) {
      bindings.push({
        componentName: state.trigger.componentName,
        nodeName: 'trigger_1',
        connectionId: state.trigger.connectionId
      });
    }
  }

  const collectAction = (action: ActionStepState) => {
    const nodeName = counter.next(action.componentName);

    if (action.connectionId != null) {
      bindings.push({componentName: action.componentName, nodeName, connectionId: action.connectionId});
    }
  };

  for (const step of state.steps) {
    if (step.kind === 'action') {
      collectAction(step);
    } else {
      // IMPORTANT: must match buildConditionNode ordering — caseTrue actions,
      // then caseFalse actions, then the condition node itself consumes a name.
      step.caseTrue.forEach(collectAction);
      step.caseFalse.forEach(collectAction);
      counter.next('condition');
    }
  }

  return bindings;
}

// Re-export for the UI layer convenience.
export {CONDITION_OPERATIONS};
```

- [ ] **Step 2: Verify the pure function output by eye (no test runner in this repo)**

Temporarily append this scratch block at the bottom of `definition.ts`, then read its output via the dev console after wiring the page — OR, faster, mentally trace this expected output now and confirm the code matches. Do NOT commit the scratch block.

Given a state with `label="Test"`, `description="d"`, trigger `googleMail/newEmail`, one condition step (`value1="${trigger_1.from}"`, op `CONTAINS`, value2 `"vip"`) whose `caseTrue` has one `slack/sendChannelMessage` (`channel="C1"`, `text="hi"`), `buildWorkflowDefinition` must produce:

```jsonc
{
  "label": "Test",
  "description": "d",
  "triggers": [
    { "name": "trigger_1", "label": "New Email", "type": "googleMail/v1/newEmail", "parameters": {} }
  ],
  "tasks": [
    {
      "name": "condition_1",
      "label": "Condition",
      "type": "condition/v1",
      "parameters": {
        "rawExpression": false,
        "conditions": [[ { "type": "string", "value1": "${trigger_1.from}", "operation": "CONTAINS", "value2": "vip" } ]],
        "caseTrue": [
          { "name": "slack_1", "label": "Send Channel Message", "type": "slack/v1/sendChannelMessage", "parameters": { "channel": "C1", "text": "hi" } }
        ],
        "caseFalse": []
      }
    }
  ]
}
```

And `collectConnectionBindings` for the same state with the Slack action's `connectionId=5` must return `[{componentName:'slack', nodeName:'slack_1', connectionId:5}]`. Confirm the code paths produce exactly this (especially that the nested `slack_1` name matches between both functions).

- [ ] **Step 3: Lint**

Run: `cd front-end && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd front-end && git add src/app/builder/definition.ts
git commit -m "Add pure workflow-definition builder and connection-binding collector

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: JSON preview component

**Files:**
- Create: `front-end/src/app/builder/components/json-preview.tsx`

- [ ] **Step 1: Create the preview**

```tsx
'use client';

interface JsonPreviewProps {
  json: string;
}

export default function JsonPreview({json}: JsonPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Workflow Definition</h2>

      <pre className="max-h-[calc(100vh-10rem)] overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
        <code>{json}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/json-preview.tsx
git commit -m "Add workflow builder JSON preview component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Field inputs component

**Files:**
- Create: `front-end/src/app/builder/components/field-inputs.tsx`

- [ ] **Step 1: Create the field renderer**

Renders catalog fields (skipping hidden ones) into labeled inputs and reports changes.

```tsx
'use client';

import {CatalogField} from '../catalog';
import {FieldValues} from '../definition';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

interface FieldInputsProps {
  fields: CatalogField[];
  values: FieldValues;
  onChange: (key: string, value: string) => void;
}

export default function FieldInputs({fields, values, onChange}: FieldInputsProps) {
  const visibleFields = fields.filter((field) => field.kind !== 'hidden');

  if (visibleFields.length === 0) {
    return <p className="text-xs text-muted-foreground">No parameters for this operation.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {visibleFields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <Label className="text-xs">
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>

          <Input
            value={values[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/field-inputs.tsx
git commit -m "Add workflow builder field inputs component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Connection picker component

**Files:**
- Create: `front-end/src/app/builder/components/connection-picker.tsx`

- [ ] **Step 1: Create the picker**

Lazy-loads existing connections for a component when mounted, shows them in a native `<select>`.

```tsx
'use client';

import {useEffect, useState} from 'react';
import {ComponentConnection, fetchComponentConnections} from '@/lib/api';
import {ComponentName} from '../catalog';

interface ConnectionPickerProps {
  componentName: ComponentName;
  connectionId?: number;
  onChange: (connectionId: number | undefined) => void;
}

export default function ConnectionPicker({componentName, connectionId, onChange}: ConnectionPickerProps) {
  const [connections, setConnections] = useState<ComponentConnection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchComponentConnections(componentName)
      .then((data) => {
        if (active) {
          setConnections(data);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load connections');
        }
      });

    return () => {
      active = false;
    };
  }, [componentName]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">Connection</label>

      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={connectionId ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      >
        <option value="">No connection</option>

        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name}
          </option>
        ))}
      </select>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && connections.length === 0 ? (
        <p className="text-xs text-muted-foreground">No existing connections for this component.</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/connection-picker.tsx
git commit -m "Add workflow builder connection picker component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Action step component

**Files:**
- Create: `front-end/src/app/builder/components/action-step.tsx`

- [ ] **Step 1: Create the action step**

A self-contained editor for one action: component select → operation select → fields → connection picker → remove button. It edits an `ActionStepState` via an `onChange` callback (immutable update).

```tsx
'use client';

import {Trash2Icon} from 'lucide-react';
import {COMPONENTS, ComponentName, findComponent, findOperation} from '../catalog';
import {ActionStepState} from '../definition';
import FieldInputs from './field-inputs';
import ConnectionPicker from './connection-picker';
import {Button} from '@/components/ui/button';

interface ActionStepProps {
  step: ActionStepState;
  onChange: (step: ActionStepState) => void;
  onRemove: () => void;
}

export default function ActionStep({step, onChange, onRemove}: ActionStepProps) {
  const component = findComponent(step.componentName);
  const operation = findOperation(component, step.operation, 'actions');

  const handleComponentChange = (componentName: ComponentName) => {
    const nextComponent = findComponent(componentName);
    const firstOperation = nextComponent.actions[0];

    onChange({
      ...step,
      componentName,
      operation: firstOperation.name,
      parameters: {},
      connectionId: undefined
    });
  };

  const handleOperationChange = (operationName: string) => {
    onChange({...step, operation: operationName, parameters: {}});
  };

  const handleFieldChange = (key: string, value: string) => {
    onChange({...step, parameters: {...step.parameters, [key]: value}});
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</span>

        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Component</label>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={step.componentName}
              onChange={(event) => handleComponentChange(event.target.value as ComponentName)}
            >
              {COMPONENTS.map((candidate) => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Operation</label>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={step.operation}
              onChange={(event) => handleOperationChange(event.target.value)}
            >
              {component.actions.map((candidate) => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FieldInputs fields={operation ? operation.fields : []} values={step.parameters} onChange={handleFieldChange} />

        <ConnectionPicker
          componentName={step.componentName}
          connectionId={step.connectionId}
          onChange={(connectionId) => onChange({...step, connectionId})}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/action-step.tsx
git commit -m "Add workflow builder action step component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Condition step component

**Files:**
- Create: `front-end/src/app/builder/components/condition-step.tsx`

- [ ] **Step 1: Create the condition step**

A comparison row plus two nested action lists. Reuses `ActionStep` for nested actions. Generates
ids for nested actions with a simple counter helper passed from the page (see Task 9) — here it
takes an `onAddAction` callback so the page owns id generation.

```tsx
'use client';

import {Trash2Icon, PlusIcon} from 'lucide-react';
import {CONDITION_OPERATIONS, ConditionStepState, ActionStepState} from '../definition';
import ActionStep from './action-step';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

interface ConditionStepProps {
  step: ConditionStepState;
  onChange: (step: ConditionStepState) => void;
  onRemove: () => void;
  createAction: () => ActionStepState; // page-provided factory (handles id generation)
}

export default function ConditionStep({step, onChange, onRemove, createAction}: ConditionStepProps) {
  const needsValue2 = step.operation !== 'EMPTY' && step.operation !== 'NOT_EMPTY';

  const updateBranch = (branch: 'caseTrue' | 'caseFalse', actions: ActionStepState[]) => {
    onChange({...step, [branch]: actions});
  };

  const renderBranch = (branch: 'caseTrue' | 'caseFalse', title: string) => {
    const actions = step[branch];

    return (
      <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
        <span className="text-xs font-semibold text-foreground">{title}</span>

        {actions.map((action, index) => (
          <ActionStep
            key={action.id}
            step={action}
            onChange={(updated) => updateBranch(branch, actions.map((current, i) => (i === index ? updated : current)))}
            onRemove={() => updateBranch(branch, actions.filter((_, i) => i !== index))}
          />
        ))}

        <Button variant="outline" size="sm" className="self-start" onClick={() => updateBranch(branch, [...actions, createAction()])}>
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Action
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</span>

        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Input
          value={step.value1}
          placeholder="${trigger_1.from}"
          onChange={(event) => onChange({...step, value1: event.target.value})}
        />

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={step.operation}
          onChange={(event) => onChange({...step, operation: event.target.value})}
        >
          {CONDITION_OPERATIONS.map((operation) => (
            <option key={operation.value} value={operation.value}>
              {operation.label}
            </option>
          ))}
        </select>

        <Input
          value={step.value2}
          placeholder="vip"
          disabled={!needsValue2}
          onChange={(event) => onChange({...step, value2: event.target.value})}
        />
      </div>

      <div className="flex flex-col gap-3">
        {renderBranch('caseTrue', 'If true')}
        {renderBranch('caseFalse', 'If false')}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/condition-step.tsx
git commit -m "Add workflow builder condition step component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Trigger card component

**Files:**
- Create: `front-end/src/app/builder/components/trigger-card.tsx`

- [ ] **Step 1: Create the trigger card**

```tsx
'use client';

import {COMPONENTS, ComponentName, findComponent, findOperation} from '../catalog';
import {TriggerState} from '../definition';
import FieldInputs from './field-inputs';
import ConnectionPicker from './connection-picker';

interface TriggerCardProps {
  trigger: TriggerState;
  onChange: (trigger: TriggerState) => void;
}

export default function TriggerCard({trigger, onChange}: TriggerCardProps) {
  const component = findComponent(trigger.componentName);
  const operation = findOperation(component, trigger.operation, 'triggers');

  const handleComponentChange = (componentName: ComponentName) => {
    const nextComponent = findComponent(componentName);

    onChange({
      ...trigger,
      componentName,
      operation: nextComponent.triggers[0].name,
      parameters: {},
      connectionId: undefined
    });
  };

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-white p-4 shadow-xs">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">Trigger</span>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Component</label>

          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={trigger.componentName}
            onChange={(event) => handleComponentChange(event.target.value as ComponentName)}
          >
            {COMPONENTS.map((candidate) => (
              <option key={candidate.name} value={candidate.name}>
                {candidate.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Trigger</label>

          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={trigger.operation}
            onChange={(event) => onChange({...trigger, operation: event.target.value, parameters: {}})}
          >
            {component.triggers.map((candidate) => (
              <option key={candidate.name} value={candidate.name}>
                {candidate.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <FieldInputs
          fields={operation ? operation.fields : []}
          values={trigger.parameters}
          onChange={(key, value) => onChange({...trigger, parameters: {...trigger.parameters, [key]: value}})}
        />

        <ConnectionPicker
          componentName={trigger.componentName}
          connectionId={trigger.connectionId}
          onChange={(connectionId) => onChange({...trigger, connectionId})}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/components/trigger-card.tsx
git commit -m "Add workflow builder trigger card component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Builder page (wire everything + save flow)

**Files:**
- Create: `front-end/src/app/builder/page.tsx`

- [ ] **Step 1: Create the page**

Holds `BuilderState`, renders the two-column layout, owns id generation, and runs the save flow.

```tsx
'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {PlusIcon, GitBranchIcon, ZapIcon} from 'lucide-react';
import {COMPONENTS} from './catalog';
import {
  ActionStepState,
  BuilderState,
  ConditionStepState,
  StepState,
  buildWorkflowDefinition,
  collectConnectionBindings
} from './definition';
import TriggerCard from './components/trigger-card';
import ActionStep from './components/action-step';
import ConditionStep from './components/condition-step';
import JsonPreview from './components/json-preview';
import {bindWorkflowNodeConnection, createBuilderWorkflow} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

// Monotonic id source for client-side step identity. Lives at module scope so
// ids stay unique across the page's lifetime without going through state.
let nextStepId = 0;

function makeId(): string {
  nextStepId += 1;

  return `step_${nextStepId}`;
}

function createAction(): ActionStepState {
  const firstComponent = COMPONENTS[0];

  return {
    kind: 'action',
    id: makeId(),
    componentName: firstComponent.name,
    operation: firstComponent.actions[0].name,
    parameters: {}
  };
}

function createCondition(): ConditionStepState {
  return {
    kind: 'condition',
    id: makeId(),
    value1: '',
    operation: 'EQUALS',
    value2: '',
    caseTrue: [],
    caseFalse: []
  };
}

export default function BuilderPage() {
  const [state, setState] = useState<BuilderState>(() => ({
    label: 'My Custom Workflow',
    description: '',
    trigger: {
      componentName: COMPONENTS[0].name,
      operation: COMPONENTS[0].triggers[0].name,
      parameters: {}
    },
    steps: []
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedUuid, setSavedUuid] = useState<string | null>(null);

  const router = useRouter();

  const definitionJson = useMemo(() => buildWorkflowDefinition(state), [state]);

  const updateStep = (index: number, step: StepState) => {
    setState((current) => ({
      ...current,
      steps: current.steps.map((existing, i) => (i === index ? step : existing))
    }));
  };

  const removeStep = (index: number) => {
    setState((current) => ({...current, steps: current.steps.filter((_, i) => i !== index)}));
  };

  const addStep = (step: StepState) => {
    setState((current) => ({...current, steps: [...current.steps, step]}));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setSavedUuid(null);

    try {
      if (!state.trigger) {
        throw new Error('A trigger is required.');
      }

      const workflowUuid = await createBuilderWorkflow(buildWorkflowDefinition(state));

      const bindings = collectConnectionBindings(state);
      const failedBindings: string[] = [];

      for (const binding of bindings) {
        const response = await bindWorkflowNodeConnection(
          workflowUuid,
          binding.nodeName,
          binding.componentName,
          binding.connectionId
        );

        if (!response.ok) {
          failedBindings.push(binding.nodeName);
        }
      }

      setSavedUuid(workflowUuid);
      setSuccess(
        failedBindings.length === 0
          ? 'Workflow saved successfully!'
          : `Workflow saved, but failed to bind connections for: ${failedBindings.join(', ')}.`
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full justify-center">
      <div className="grid w-full max-w-7xl grid-cols-1 gap-6 py-4 lg:grid-cols-2">
        {/* Builder column */}
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Custom Workflow Builder</h1>

          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive" role="alert">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700" role="alert">
              {success}
              {savedUuid ? (
                <button className="ml-2 underline" onClick={() => router.push(`/automations/${savedUuid}`)}>
                  View workflow
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Label</Label>
              <Input value={state.label} onChange={(event) => setState({...state, label: event.target.value})} />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Description</Label>
              <Input value={state.description} onChange={(event) => setState({...state, description: event.target.value})} />
            </div>
          </div>

          {state.trigger ? (
            <TriggerCard trigger={state.trigger} onChange={(trigger) => setState({...state, trigger})} />
          ) : null}

          {state.steps.map((step, index) =>
            step.kind === 'action' ? (
              <ActionStep
                key={step.id}
                step={step}
                onChange={(updated) => updateStep(index, updated)}
                onRemove={() => removeStep(index)}
              />
            ) : (
              <ConditionStep
                key={step.id}
                step={step}
                onChange={(updated) => updateStep(index, updated)}
                onRemove={() => removeStep(index)}
                createAction={createAction}
              />
            )
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => addStep(createAction())}>
              <ZapIcon className="mr-1 h-4 w-4" />
              Add Action
            </Button>

            <Button variant="outline" onClick={() => addStep(createCondition())}>
              <GitBranchIcon className="mr-1 h-4 w-4" />
              Add Condition
            </Button>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="self-start">
            <PlusIcon className="mr-1 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <JsonPreview json={definitionJson} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the app and verify end to end**

Run: `cd front-end && npm run dev` (ensure the ByteChef server is reachable at `NEXT_PUBLIC_BYTECHEF_APP_BASE_URL` and the token backend at `NEXT_PUBLIC_BACKEND_APP_BASE_URL`).
Navigate to `http://localhost:3000/builder`. Verify:
- The trigger card defaults to Gmail / New Email; the JSON preview shows a `triggers` array with `trigger_1` of type `googleMail/v1/newEmail`.
- Adding a "Send Channel Message" Slack action makes the preview show a `slack_1` task with `type: "slack/v1/sendChannelMessage"` and the `channel`/`text` parameters you type.
- Adding a Condition with an "If true" Slack action nests `slack_1` under `condition_1.parameters.caseTrue` (and top-level actions added after get the next slack index).
- Connection dropdowns populate if the user has connections (empty otherwise — that's fine).
- Clicking **Save Workflow** shows the success banner; the workflow appears at `/automations`.

- [ ] **Step 3: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/builder/page.tsx
git commit -m "Add custom workflow builder page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Navigation entry

**Files:**
- Modify: `front-end/src/app/layout.tsx`

- [ ] **Step 1: Add the nav item**

In `layout.tsx`, add `Wand2Icon` to the existing `lucide-react` import (keep imports sorted), and add a navigation entry to the `navigation` array, after the `Automations` entry:

```tsx
  { name: 'Workflow Builder', href: '/builder', icon: Wand2Icon },
```

The `lucide-react` import block becomes (insert `Wand2Icon` in alphabetical position):

```tsx
import {
  CalendarIcon,
  ChartPieIcon,
  FilesIcon,
  FoldersIcon,
  HomeIcon,
  MessageCircleIcon,
  SquareIcon,
  UsersIcon,
  Wand2Icon,
  WebhookIcon,
  WorkflowIcon,
  ZapIcon
} from "lucide-react";
```

- [ ] **Step 2: Verify**

Run: `cd front-end && npm run dev` and confirm "Workflow Builder" appears in the sidebar and links to `/builder`.

- [ ] **Step 3: Lint + commit**

```bash
cd front-end && npm run lint && git add src/app/layout.tsx
git commit -m "Add Workflow Builder to sidebar navigation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Spec coverage:** trigger+2 actions per Gmail/Slack (catalog, Task 2 — Gmail has 3 actions, Slack 3, ≥2 satisfied); condition with nested branches (Tasks 3, 8); JSON preview (Task 4); save via `createFrontendProjectWorkflow` (Tasks 1, 10); connection select+bind (Tasks 1, 6, 10); nav entry (Task 11).
- **Name-sync invariant:** `buildWorkflowDefinition` and `collectConnectionBindings` MUST assign identical node names. Both use a `NameCounter` with the same traversal order (trigger fixed `trigger_1`; then steps in order; for conditions, caseTrue actions → caseFalse actions → the condition node). If you change one, change the other.
- **No `Select` primitive / no test runner** in this repo by design — native `<select>` and JSON-preview verification are intentional, not omissions.
```
