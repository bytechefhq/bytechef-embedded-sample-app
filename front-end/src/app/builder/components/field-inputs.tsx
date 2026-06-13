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
