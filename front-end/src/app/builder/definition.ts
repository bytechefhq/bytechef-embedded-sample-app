import {
  CONDITION_OPERATIONS,
  CatalogOperation,
  ConditionOperationValue,
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
  operation: ConditionOperationValue; // EQUALS, NOT_EQUALS, ...
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
function buildActionParameters(catalogOperation: CatalogOperation | undefined, values: FieldValues): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};

  if (!catalogOperation) {
    return parameters;
  }

  for (const field of catalogOperation.fields) {
    if (field.kind === 'hidden') {
      if (field.defaultValue != null) {
        parameters[field.key] = field.defaultValue;
      }

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
    parameters: buildActionParameters(catalogOperation, step.parameters)
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
