'use client';

import {Trash2Icon, PlusIcon} from 'lucide-react';
import {ConditionOperationValue} from '../catalog';
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
          onChange={(event) => onChange({...step, operation: event.target.value as ConditionOperationValue})}
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
