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
          idPrefix="trigger"
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
