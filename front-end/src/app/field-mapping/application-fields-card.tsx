"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, Trash2Icon } from "lucide-react";

export type ApplicationFieldTypeType = "boolean" | "number" | "string";

export interface ApplicationFieldI {
  label: string;
  name: string;
  type: ApplicationFieldTypeType;
}

interface ApplicationFieldsCardProps {
  fields: ApplicationFieldI[];
  objectName: string;
  onFieldsChange: (fields: ApplicationFieldI[]) => void;
  onObjectNameChange: (objectName: string) => void;
  onUserCanCreateFieldsChange: (userCanCreateFields: boolean) => void;
  onUserCanRemoveMappingsChange: (userCanRemoveMappings: boolean) => void;
  userCanCreateFields: boolean;
  userCanRemoveMappings: boolean;
}

const FIELD_TYPES: ApplicationFieldTypeType[] = ["string", "number", "boolean"];

export function ApplicationFieldsCard({
  fields,
  objectName,
  onFieldsChange,
  onObjectNameChange,
  onUserCanCreateFieldsChange,
  onUserCanRemoveMappingsChange,
  userCanCreateFields,
  userCanRemoveMappings,
}: ApplicationFieldsCardProps) {
  const updateField = (index: number, changes: Partial<ApplicationFieldI>) =>
    onFieldsChange(fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...changes } : field)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Describe Your Application&rsquo;s Fields</CardTitle>

        <CardDescription>
          These become <code>mapObjectFields[objectName].applicationFields</code>: one row per field in the Connect
          dialog. <strong>Name</strong> is the key the Field Mapping actions read and write, so a dotted path like{" "}
          <code>company.name</code> reaches into a nested object. <strong>Label</strong> is what the user sees.{" "}
          <strong>Type</strong> only shapes the generated sample record below; the dialog does not use it.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="objectName">Object Name</Label>

          <Input
            id="objectName"
            onChange={(event) => onObjectNameChange(event.target.value)}
            placeholder="e.g. Contacts"
            value={objectName}
          />

          <p className="text-xs text-muted-foreground">
            Must equal the <code>objectName</code> of the workflow&rsquo;s field mapping input, case included. The
            dialog renders nothing for an input whose object name has no entry.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-medium">Fields</legend>

          <div className="grid grid-cols-[1fr_1fr_6rem_2rem] gap-2 text-xs text-muted-foreground">
            <span>Name</span>

            <span>Label</span>

            <span>Type</span>
          </div>

          {fields.map((field, index) => (
            <div className="grid grid-cols-[1fr_1fr_6rem_2rem] items-center gap-2" key={index}>
              <Input
                aria-label="Field name"
                className="font-mono"
                onChange={(event) => updateField(index, { name: event.target.value })}
                placeholder="e.g. jobTitle"
                value={field.name}
              />

              <Input
                aria-label="Field label"
                onChange={(event) => updateField(index, { label: event.target.value })}
                placeholder="e.g. Job title"
                value={field.label}
              />

              <select
                aria-label="Field type"
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                onChange={(event) => updateField(index, { type: event.target.value as ApplicationFieldTypeType })}
                value={field.type}
              >
                {FIELD_TYPES.map((fieldType) => (
                  <option key={fieldType} value={fieldType}>
                    {fieldType}
                  </option>
                ))}
              </select>

              <Button
                aria-label="Remove field"
                onClick={() => onFieldsChange(fields.filter((_field, fieldIndex) => fieldIndex !== index))}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}

          <div>
            <Button
              onClick={() => onFieldsChange([...fields, { label: "", name: "", type: "string" }])}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon className="mr-2 size-4" />
              Add Field
            </Button>
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <Switch checked={userCanCreateFields} id="userCanCreateFields" onCheckedChange={onUserCanCreateFieldsChange} />

          <Label htmlFor="userCanCreateFields">
            <span>
              <code>userCanCreateFields</code>: show <strong>Add custom field</strong> in the dialog
            </span>
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={userCanRemoveMappings}
            id="userCanRemoveMappings"
            onCheckedChange={onUserCanRemoveMappingsChange}
          />

          <Label htmlFor="userCanRemoveMappings">
            <span>
              <code>userCanRemoveMappings</code>: show <strong>Remove</strong> on each row
            </span>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
