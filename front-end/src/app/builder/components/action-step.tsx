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

        <Button aria-label="Remove step" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
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

        <FieldInputs fields={operation ? operation.fields : []} idPrefix={step.id} values={step.parameters} onChange={handleFieldChange} />

        <ConnectionPicker
          componentName={step.componentName}
          connectionId={step.connectionId}
          onChange={(connectionId) => onChange({...step, connectionId})}
        />
      </div>
    </div>
  );
}
