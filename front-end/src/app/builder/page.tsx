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
