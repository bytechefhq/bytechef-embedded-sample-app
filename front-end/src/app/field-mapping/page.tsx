"use client";

import { type ApplicationFieldI, ApplicationFieldsCard } from "@/app/field-mapping/application-fields-card";
import {
  buildMapObjectFields,
  INTEGRATION_FIELD_SOURCES,
} from "@/app/field-mapping/integration-field-sources";
import { MappingPreview } from "@/app/field-mapping/mapping-preview";
import { PrepareWorkflowCard } from "@/components/playground/prepare-workflow-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { type MapObjectFieldsType, useConnectDialog } from "@bytechef/embedded";
import { Link2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface IntegrationInputI {
  label?: string;
  name: string;
  objectName?: string;
  type?: string;
}

interface IntegrationWorkflowI {
  inputs?: IntegrationInputI[];
  label?: string;
  workflowUuid?: string;
}

interface IntegrationInstanceWorkflowI {
  enabled?: boolean;
  inputs?: Record<string, unknown>;
  workflowUuid?: string;
}

interface IntegrationInstanceI {
  id?: number;
  workflows?: IntegrationInstanceWorkflowI[];
}

interface IntegrationI {
  componentName?: string;
  id?: number;
  integrationInstances?: IntegrationInstanceI[];
  name?: string;
  workflows?: IntegrationWorkflowI[];
}

interface FieldMappingInputOptionI {
  input: IntegrationInputI;
  key: string;
  workflowLabel: string;
  workflowUuid: string;
}

interface FieldMappingSelectionI {
  integrationInstance?: IntegrationInstanceI;
  options: FieldMappingInputOptionI[];
  selected?: FieldMappingInputOptionI;
  storedMapping: unknown;
  workflowEnabled: boolean;
}

const defaultApplicationFields: ApplicationFieldI[] = [
  { label: "First name", name: "firstName", type: "string" },
  { label: "Last name", name: "lastName", type: "string" },
  { label: "Email", name: "email", type: "string" },
  { label: "Job title", name: "jobTitle", type: "string" },
  { label: "Company", name: "company.name", type: "string" },
];

const exampleMapping = {
  mappings: [
    { applicationField: { custom: false, label: "First name", value: "firstName" }, integrationField: "FirstName" },
    { applicationField: { custom: false, label: "Last name", value: "lastName" }, integrationField: "LastName" },
    { applicationField: { custom: false, label: "Email", value: "email" }, integrationField: "Email" },
    { applicationField: { custom: false, label: "Job title", value: "jobTitle" }, integrationField: "Title" },
    { applicationField: { custom: false, label: "Company", value: "company.name" }, integrationField: "Company" },
  ],
  objectType: "Lead",
};

const exampleMappingJson = JSON.stringify(exampleMapping, null, 2);

export default function FieldMappingPage() {
  const [applicationFields, setApplicationFields] = useState<ApplicationFieldI[]>(defaultApplicationFields);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [integration, setIntegration] = useState<IntegrationI | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState("");
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationI[]>([]);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [mappingJson, setMappingJson] = useState(exampleMappingJson);
  const [objectName, setObjectName] = useState("Contacts");
  const [selectedInputKey, setSelectedInputKey] = useState("");
  const [userCanCreateFields, setUserCanCreateFields] = useState(true);
  const [userCanRemoveMappings, setUserCanRemoveMappings] = useState(true);

  const selection = useMemo(() => selectFieldMappingInput(integration, selectedInputKey), [integration, selectedInputKey]);

  const storedMappingJson = useMemo(() => toMappingJson(selection.storedMapping), [selection.storedMapping]);

  const fieldSource = integration?.componentName ? INTEGRATION_FIELD_SOURCES[integration.componentName] : undefined;

  const mapObjectFields = useMemo(
    () =>
      fieldSource &&
      buildMapObjectFields(objectName, fieldSource, {
        fields: applicationFields
          .filter((field) => field.name.trim())
          .map((field) => ({ label: field.label.trim() || field.name.trim(), value: field.name.trim() })),
        userCanCreateFields,
        userCanRemoveMappings,
      }),
    [applicationFields, fieldSource, objectName, userCanCreateFields, userCanRemoveMappings]
  );

  const sampleWorkflowJson = useMemo(() => JSON.stringify(buildSampleWorkflow(objectName), null, 2), [objectName]);

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);

    try {
      const response = await fetch("/api/integrations");

      const text = await response.text();

      if (!response.ok) {
        setIntegrationsError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      setIntegrations((text ? JSON.parse(text) : []) as IntegrationI[]);
    } catch (loadError) {
      setIntegrationsError(loadError instanceof Error ? loadError.message : "Could not load integrations");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const loadIntegration = async (id: string, inputKey: string) => {
    setIntegrationError(null);

    if (!id) {
      setIntegration(null);

      return;
    }

    setIntegrationLoading(true);

    try {
      const response = await fetch(`/api/integrations/${encodeURIComponent(id)}`);

      const text = await response.text();

      if (!response.ok) {
        setIntegration(null);
        setIntegrationError(formatBody(text) || `HTTP ${response.status}`);

        return;
      }

      const loadedIntegration = JSON.parse(text) as IntegrationI;

      setIntegration(loadedIntegration);

      const loadedMappingJson = toMappingJson(selectFieldMappingInput(loadedIntegration, inputKey).storedMapping);

      if (loadedMappingJson) {
        setMappingJson(loadedMappingJson);
      }
    } catch (loadError) {
      setIntegration(null);
      setIntegrationError(loadError instanceof Error ? loadError.message : "Could not load the integration");
    } finally {
      setIntegrationLoading(false);
    }
  };

  const selectIntegration = (id: string) => {
    setIntegrationId(id);
    setSelectedInputKey("");

    loadIntegration(id, "");
  };

  const selectInput = (inputKey: string) => {
    setSelectedInputKey(inputKey);

    const selectedMappingJson = toMappingJson(selectFieldMappingInput(integration, inputKey).storedMapping);

    if (selectedMappingJson) {
      setMappingJson(selectedMappingJson);
    }
  };

  useEffect(() => {
    loadIntegrations();

    getToken()
      .then(setJwtToken)
      .catch((tokenError) =>
        setIntegrationsError(tokenError instanceof Error ? tokenError.message : "Could not fetch a token")
      );
  }, [loadIntegrations]);

  const selectedObjectName = selection.selected?.input.objectName;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-xl font-semibold">Field Mapping Playground</h1>

      <PrepareWorkflowCard
        description={
          <>
            Field mapping lets each connected user pair your application&rsquo;s fields with their integration&rsquo;s
            fields inside the Connect dialog. The workflow declares a <code>field_mapping</code> input with an object
            name, and the <strong>Field Mapping</strong> component applies the user&rsquo;s saved pairing at run time.
          </>
        }
        sampleWorkflowJson={sampleWorkflowJson}
        steps={
          <>
            <li>
              In ByteChef, open <strong>Embedded &rsaquo; Integrations</strong> and create an integration for the{" "}
              <strong>Salesforce</strong> component.
            </li>

            <li>
              Create a workflow in it, open the <strong>Workflow Code Editor</strong> from the right sidebar, replace
              the definition with the workflow below and save. It declares the <code>{objectName || "Contacts"}</code>{" "}
              field mapping input and maps the request body both ways. The editor may list the input type as invalid;
              that does not block saving.
            </li>

            <li>
              Optional: to use <strong>Test</strong> in the editor, set the input&rsquo;s <strong>Test Value</strong>{" "}
              in <strong>Workflow Inputs</strong> to a <code>sampleMapping</code>, as described in step 5.
            </li>

            <li>
              <strong>Publish</strong> the integration, then enable its configuration for the published version and
              enable the workflow in it.
            </li>

            <li>
              In step 3, pick the integration and open the Connect dialog to connect Salesforce, enable the workflow
              and map the fields.
            </li>
          </>
        }
        title="1. Prepare the Workflow in ByteChef"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ApplicationFieldsCard
          fields={applicationFields}
          objectName={objectName}
          onFieldsChange={setApplicationFields}
          onObjectNameChange={setObjectName}
          onUserCanCreateFieldsChange={setUserCanCreateFields}
          onUserCanRemoveMappingsChange={setUserCanRemoveMappings}
          userCanCreateFields={userCanCreateFields}
          userCanRemoveMappings={userCanRemoveMappings}
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle>3. Map in the Connect Dialog</CardTitle>

              <CardDescription>
                Opens <code>useConnectDialog</code> with <code>mapObjectFields</code>. Its{" "}
                <code>objectTypes.get</code> returns a fixed list and its <code>integrationFields.get</code> calls{" "}
                <code>executeAction</code>, which runs a component action on the user&rsquo;s own connection.
              </CardDescription>
            </div>

            <Button disabled={integrationsLoading} onClick={loadIntegrations} size="sm" type="button" variant="outline">
              <RefreshCwIcon className="mr-2 size-4" />
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {integrationsError && (
              <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{integrationsError}</pre>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="integrationId">Integration</Label>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                disabled={integrationsLoading || integrations.length === 0}
                id="integrationId"
                onChange={(event) => selectIntegration(event.target.value)}
                value={integrationId}
              >
                <option value="">
                  {integrationsLoading
                    ? "Loading..."
                    : integrations.length === 0
                      ? "No active integrations"
                      : "Select an integration"}
                </option>

                {integrations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || `Integration ${item.id}`}
                    {item.componentName ? ` (${item.componentName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {integrationLoading && <p className="text-sm text-muted-foreground">Loading workflows...</p>}

            {integrationError && (
              <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{integrationError}</pre>
            )}

            {integration && !fieldSource && (
              <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
                No field source for the <code>{integration.componentName}</code> component. Add an entry keyed by its
                name to <code>INTEGRATION_FIELD_SOURCES</code> in{" "}
                <code>src/app/field-mapping/integration-field-sources.ts</code>: the object types to offer, the action
                that lists an object type&rsquo;s fields, and how to turn that action&rsquo;s result into options.
              </p>
            )}

            {integration && selection.options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No workflow of this integration declares a field mapping input. Add the sample workflow from step 1.
              </p>
            )}

            {selection.options.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="fieldMappingInput">Field Mapping Input</Label>

                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="fieldMappingInput"
                  onChange={(event) => selectInput(event.target.value)}
                  value={selection.selected?.key ?? ""}
                >
                  {selection.options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.workflowLabel} &rsaquo; {option.input.label || option.input.name}
                    </option>
                  ))}
                </select>

                {selection.selected && (
                  <p className="text-xs text-muted-foreground">
                    Input <code>{selection.selected.input.name}</code>, type <code>{selection.selected.input.type}</code>,
                    object name <code>{selectedObjectName ?? "(none)"}</code>.
                  </p>
                )}
              </div>
            )}

            {selection.selected && selectedObjectName !== objectName && (
              <div className="flex items-center justify-between gap-4 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
                <span>
                  This input&rsquo;s object name is <code>{selectedObjectName ?? "(none)"}</code>, but the page passes{" "}
                  <code>{objectName}</code>. The dialog would show no mapping for it.
                </span>

                {selectedObjectName && (
                  <Button onClick={() => setObjectName(selectedObjectName)} size="sm" type="button" variant="outline">
                    Use {selectedObjectName}
                  </Button>
                )}
              </div>
            )}

            {integration && !selection.integrationInstance && (
              <p className="text-sm text-muted-foreground">
                The demo user hasn&rsquo;t connected this integration yet. The mapping appears only after connecting,
                because <code>executeAction</code> runs against the integration instance.
              </p>
            )}

            {fieldSource && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">What integrationFields.get runs per object type</span>

                <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
                  {fieldSource.objectTypes
                    .map((objectType) => {
                      const { actionName, input } = fieldSource.fieldsRequest(objectType.value);

                      return `executeAction("${fieldSource.componentName}", ${fieldSource.componentVersion}, "${actionName}", ${JSON.stringify(input, null, 2)})`;
                    })
                    .join("\n\n")}
                </pre>
              </div>
            )}

            <div>
              <Button
                disabled={!integration || !jwtToken || dialogOpen}
                onClick={() => setDialogOpen(true)}
                type="button"
              >
                <Link2Icon className="mr-2 size-4" />
                Open Connect Dialog
              </Button>
            </div>

            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
              <p>
                <strong>SDK check.</strong> ByteChef sends this input&rsquo;s type as <code>FIELD_MAPPING</code>, and{" "}
                <code>@bytechef/embedded</code> 0.4.0 and earlier only render the mapping for <code>field_mapping</code>,
                so with them the dialog shows the workflow but no mapping section. Link an SDK build with the fix (see{" "}
                <strong>Developing with the Embedded React SDK</strong> in <code>front-end/README.md</code>), restart{" "}
                <code>npm run dev</code>, then check:
              </p>

              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  On the dialog&rsquo;s <strong>Workflows</strong> tab, turn the workflow on. Under{" "}
                  <strong>INPUTS</strong>, its mapping heading appears with an <strong>Object type</strong> select
                  listing Lead and Contact.
                </li>

                <li>
                  Pick Lead. The browser&rsquo;s network tab shows a <code>POST</code> to{" "}
                  <code>.../components/salesforce/versions/1/actions/soqlQuery</code> with an{" "}
                  <code>X-Instance-Id</code> header, and every row&rsquo;s select fills with Lead fields.
                </li>

                <li>
                  Pair a few fields, wait a second for the dialog to save, and close it. Step 4 then shows the saved
                  value.
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>4. Stored Mapping</CardTitle>

            <CardDescription>
              The dialog saves the mapping as this input&rsquo;s value with{" "}
              <code>PUT /api/embedded/v1/integration-instances/{"{id}"}/workflows/{"{workflowUuid}"}</code>, next to the
              workflow&rsquo;s other inputs. Only completed rows are saved, and <code>custom: true</code> marks a field
              the user added. This card reads it back from <code>GET /api/embedded/v1/integrations/{"{id}"}</code>.
            </CardDescription>
          </div>

          <Button
            disabled={!integrationId || integrationLoading}
            onClick={() => loadIntegration(integrationId, selectedInputKey)}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCwIcon className="mr-2 size-4" />
            Reload
          </Button>
        </CardHeader>

        <CardContent>
          {!selection.selected && (
            <p className="text-sm text-muted-foreground">Select a field mapping input in step 3.</p>
          )}

          {selection.selected && storedMappingJson && (
            <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{storedMappingJson}</pre>
          )}

          {selection.selected && !storedMappingJson && (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet{selection.workflowEnabled ? "" : ", and the demo user hasn’t enabled this workflow"}.
              A Field Mapping step in a live run would stop with{" "}
              <em>
                The connected user has not completed the &lsquo;
                {selection.selected.input.label || selection.selected.input.name}&rsquo; field mapping
              </em>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <MappingPreview
        compareWorkflow={
          selection.selected
            ? {
                enabled: selection.workflowEnabled,
                label: selection.selected.workflowLabel,
                workflowUuid: selection.selected.workflowUuid,
              }
            : null
        }
        exampleMappingJson={exampleMappingJson}
        fields={applicationFields}
        mappingJson={mappingJson}
        onMappingJsonChange={setMappingJson}
        storedMappingJson={storedMappingJson}
      />

      {dialogOpen && integrationId && jwtToken && (
        <ConnectDialogOpener
          integrationId={integrationId}
          jwtToken={jwtToken}
          mapObjectFields={mapObjectFields}
          onDone={() => {
            setDialogOpen(false);

            loadIntegration(integrationId, selectedInputKey);
          }}
        />
      )}
    </div>
  );
}

interface ConnectDialogOpenerProps {
  integrationId: string;
  jwtToken: string;
  mapObjectFields?: MapObjectFieldsType;
  onDone: () => void;
}

function ConnectDialogOpener({ integrationId, jwtToken, mapObjectFields, onDone }: ConnectDialogOpenerProps) {
  const { closeDialog, openDialog } = useConnectDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    integrationId,
    jwtToken,
    mapObjectFields,
  });

  useEffect(() => {
    openDialog();

    const observer = new MutationObserver(() => {
      const portal = document.getElementById("connect-dialog-portal");

      if (portal && portal.childNodes.length === 0) {
        onDone();
      }
    });

    const portal = document.getElementById("connect-dialog-portal");

    if (portal) {
      observer.observe(portal, { childList: true });
    }

    return () => {
      observer.disconnect();
      closeDialog();
    };
  }, []);

  return null;
}

function selectFieldMappingInput(integration: IntegrationI | null, selectedInputKey: string): FieldMappingSelectionI {
  const options = (integration?.workflows ?? []).flatMap((workflow) =>
    (workflow.inputs ?? [])
      .filter((input) => workflow.workflowUuid && input.type?.toLowerCase() === "field_mapping")
      .map((input) => ({
        input,
        key: `${workflow.workflowUuid}:${input.name}`,
        workflowLabel: workflow.label || "Untitled",
        workflowUuid: workflow.workflowUuid!,
      }))
  );

  const selected = options.find((option) => option.key === selectedInputKey) ?? options[0];
  const integrationInstance = integration?.integrationInstances?.[0];
  const instanceWorkflow = integrationInstance?.workflows?.find(
    (workflow) => workflow.workflowUuid === selected?.workflowUuid
  );

  return {
    integrationInstance,
    options,
    selected,
    storedMapping: selected ? instanceWorkflow?.inputs?.[selected.input.name] : undefined,
    workflowEnabled: instanceWorkflow?.enabled ?? false,
  };
}

function toMappingJson(storedMapping: unknown): string | null {
  if (storedMapping === undefined || storedMapping === null || storedMapping === "") {
    return null;
  }

  if (typeof storedMapping === "string") {
    return formatBody(storedMapping);
  }

  return JSON.stringify(storedMapping, null, 2);
}

function buildSampleWorkflow(objectName: string) {
  const name = objectName.trim() || "Contacts";
  const inputName = `${name.charAt(0).toLowerCase()}${name.slice(1).replace(/[^A-Za-z0-9]/g, "")}Mapping`;

  return {
    label: `Preview ${name} Mapping`,
    description:
      "Created from the Field Mapping Playground. Maps the request body with the connected user's field mapping, to the integration and back.",
    inputs: [
      {
        name: inputName,
        label: `${name} Mapping`,
        type: "field_mapping",
        required: false,
        objectName: name,
      },
    ],
    triggers: [
      {
        label: "Await Workflow and Respond",
        name: "trigger_1",
        type: "request/v1/awaitWorkflowAndRespond",
        parameters: {},
      },
    ],
    tasks: [
      {
        label: "Map to integration fields",
        name: "fieldMapping_1",
        type: "fieldMapping/v1/mapToIntegration",
        parameters: {
          objectName: name,
          inputType: "OBJECT",
          data: "${trigger_1.body}",
          includeUnmapped: false,
        },
      },
      {
        label: "Map back to application fields",
        name: "fieldMapping_2",
        type: "fieldMapping/v1/mapToApplication",
        parameters: {
          objectName: name,
          inputType: "OBJECT",
          data: "${fieldMapping_1}",
          includeUnmapped: false,
        },
      },
    ],
    outputs: [
      { name: "integrationRecord", value: "${fieldMapping_1}" },
      { name: "applicationRecord", value: "${fieldMapping_2}" },
    ],
  };
}

function formatBody(text: string): string {
  if (!text) {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
