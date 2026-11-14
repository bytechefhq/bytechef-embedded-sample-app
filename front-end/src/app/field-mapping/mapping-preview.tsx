"use client";

import { applyFieldMapping, parseFieldMapping } from "@/app/field-mapping/apply-field-mapping";
import type { ApplicationFieldI } from "@/app/field-mapping/application-fields-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";

export interface CompareWorkflowI {
  enabled: boolean;
  label: string;
  workflowUuid: string;
}

interface MappingPreviewProps {
  compareWorkflow: CompareWorkflowI | null;
  exampleMappingJson: string;
  fields: ApplicationFieldI[];
  mappingJson: string;
  onMappingJsonChange: (mappingJson: string) => void;
  storedMappingJson: string | null;
}

const exampleRecord = {
  contactId: "c_123",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  jobTitle: "CTO",
  company: { name: "Analytical Engines" },
};

export function MappingPreview({
  compareWorkflow,
  exampleMappingJson,
  fields,
  mappingJson,
  onMappingJsonChange,
  storedMappingJson,
}: MappingPreviewProps) {
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [includeUnmapped, setIncludeUnmapped] = useState(false);
  const [recordJson, setRecordJson] = useState(JSON.stringify(exampleRecord, null, 2));

  const preview = useMemo(() => {
    try {
      const mappings = parseFieldMapping(JSON.parse(mappingJson));
      const record = JSON.parse(recordJson);

      const integrationRecord = applyFieldMapping(mappings, record, "TO_INTEGRATION", includeUnmapped);
      const applicationRecord = applyFieldMapping(mappings, integrationRecord, "TO_APPLICATION", includeUnmapped);

      return {
        applicationRecord: JSON.stringify(applicationRecord, null, 2),
        error: null,
        integrationRecord: JSON.stringify(integrationRecord, null, 2),
      };
    } catch (previewError) {
      return {
        applicationRecord: null,
        error: previewError instanceof Error ? previewError.message : "Could not apply the mapping",
        integrationRecord: null,
      };
    }
  }, [includeUnmapped, mappingJson, recordJson]);

  const runOnByteChef = async () => {
    if (!compareWorkflow) {
      return;
    }

    setCompareError(null);
    setCompareResult(null);
    setCompareLoading(true);

    try {
      const response = await fetch(`/api/request/${encodeURIComponent(compareWorkflow.workflowUuid)}`, {
        body: JSON.stringify(JSON.parse(recordJson)),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const text = await response.text();
      const formatted = formatBody(text);

      if (!response.ok) {
        setCompareError(formatted || `HTTP ${response.status}`);
      } else {
        setCompareResult(formatted || `HTTP ${response.status} (empty body)`);
      }
    } catch (requestError) {
      setCompareError(requestError instanceof Error ? requestError.message : "Request failed");
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>5. Preview the Mapping</CardTitle>

          <CardDescription>
            Applies a mapping to a sample record in your browser, with the same rules the Field Mapping component
            uses at run time. Edit either side and the result updates as you type.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="mappingJson">Mapping (JSON)</Label>

              <div className="flex gap-2">
                <Button
                  disabled={!storedMappingJson}
                  onClick={() => storedMappingJson && onMappingJsonChange(storedMappingJson)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Use Stored Mapping
                </Button>

                <Button onClick={() => onMappingJsonChange(exampleMappingJson)} size="sm" type="button" variant="outline">
                  Use Example
                </Button>
              </div>
            </div>

            <Textarea
              className="font-mono text-sm"
              id="mappingJson"
              onChange={(event) => onMappingJsonChange(event.target.value)}
              rows={12}
              value={mappingJson}
            />

            <p className="text-xs text-muted-foreground">
              The shape the Connect dialog saves. The example pairs the default fields with Salesforce Lead fields.
              Paste it under <code>{"{\"<objectName>\": {\"sampleMapping\": ...}}"}</code> as the input&rsquo;s test
              value to run Field Mapping steps from the editor.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="recordJson">Application Record (JSON)</Label>

              <Button
                onClick={() => setRecordJson(JSON.stringify(buildSampleRecord(fields), null, 2))}
                size="sm"
                type="button"
                variant="outline"
              >
                Generate From Fields
              </Button>
            </div>

            <Textarea
              className="font-mono text-sm"
              id="recordJson"
              onChange={(event) => setRecordJson(event.target.value)}
              rows={10}
              value={recordJson}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={includeUnmapped} id="includeUnmapped" onCheckedChange={setIncludeUnmapped} />

            <Label htmlFor="includeUnmapped">Include Unmapped</Label>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>A key missing from the record is skipped, so it never blanks a field. A key set to null is copied.</li>

            <li>Keys no mapping covers are dropped unless Include Unmapped is on.</li>

            <li>
              Two fields mapped to one target: going to the integration the later mapping wins, coming back both get
              the value.
            </li>

            <li>An array is mapped item by item, and every item must be an object.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>

          <CardDescription>
            <strong>Map to Integration Object</strong> turns the record into the integration&rsquo;s shape.{" "}
            <strong>Map to Application Object</strong> then turns that output back into yours, which shows what a round
            trip keeps.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {preview.error && (
            <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{preview.error}</pre>
          )}

          {preview.integrationRecord && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">mapToIntegration</span>

              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{preview.integrationRecord}</pre>
            </div>
          )}

          {preview.applicationRecord && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">mapToApplication (of the output above)</span>

              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{preview.applicationRecord}</pre>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <span className="text-sm font-medium">Compare With ByteChef</span>

            <p className="text-sm text-muted-foreground">
              Sends the record to the selected workflow with <code>POST /api/embedded/v1/workflows/{"{workflowUuid}"}</code>.
              The sample workflow from step 1 answers with both directions, using the stored mapping with Include
              Unmapped off, so load the stored mapping above to compare like with like.
            </p>

            <div>
              <Button
                disabled={!compareWorkflow?.enabled || compareLoading}
                onClick={runOnByteChef}
                size="sm"
                type="button"
              >
                {compareLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Run on ByteChef
              </Button>
            </div>

            {!compareWorkflow && (
              <p className="text-xs text-muted-foreground">Select a workflow with a field mapping input in step 3.</p>
            )}

            {compareWorkflow && !compareWorkflow.enabled && (
              <p className="text-xs text-muted-foreground">
                The demo user hasn&rsquo;t enabled <strong>{compareWorkflow.label}</strong>. Turn it on in the Connect
                dialog first.
              </p>
            )}

            {compareError && (
              <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">{compareError}</pre>
            )}

            {compareResult && <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{compareResult}</pre>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildSampleRecord(fields: ApplicationFieldI[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const field of fields) {
    const segments = field.name.split(".").filter(Boolean);

    if (segments.length === 0) {
      continue;
    }

    let current = record;

    for (const segment of segments.slice(0, -1)) {
      const nested = current[segment];
      const next = typeof nested === "object" && nested !== null ? (nested as Record<string, unknown>) : {};

      current[segment] = next;

      current = next;
    }

    current[segments[segments.length - 1]] = sampleValue(field);
  }

  return record;
}

function sampleValue(field: ApplicationFieldI): boolean | number | string {
  if (field.type === "boolean") {
    return true;
  }

  if (field.type === "number") {
    return 42;
  }

  return `Sample ${field.label || field.name}`;
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
