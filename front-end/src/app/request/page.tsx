"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

const exampleBody = {
  message: "Hello from the Request Playground"
};

export default function RequestPage() {
  const [workflowUuid, setWorkflowUuid] = useState("");
  const [bodyJson, setBodyJson] = useState(JSON.stringify(exampleBody, null, 2));
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setResult(null);
    setError(null);

    if (!workflowUuid.trim()) {
      setError("Workflow UUID is required.");

      return;
    }

    setLoading(true);

    try {
      let body: string | undefined;

      if (bodyJson.trim()) {
        body = JSON.stringify(JSON.parse(bodyJson));
      }

      const response = await fetch(
        `/api/request/${encodeURIComponent(workflowUuid.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );

      const text = await response.text();
      const formatted = formatBody(text);

      if (!response.ok) {
        setError(formatted || `HTTP ${response.status}`);
      } else {
        setResult(formatted || `HTTP ${response.status} (empty body)`);
      }
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON body");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-bold">Request Playground</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Execute Workflow</CardTitle>

            <CardDescription>
              Calls <code>POST /api/embedded/v1/workflows/{`{workflowUuid}`}</code>. The
              optional body and headers are forwarded to the workflow&rsquo;s request trigger.
              Workflows using <code>awaitWorkflowAndRespond</code> block until the workflow
              completes and return its response; workflows using{" "}
              <code>autoRespondWithHTTP200</code> return an empty 200 immediately while the
              workflow runs in the background.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="workflowUuid">Workflow UUID</Label>

                <Input
                  id="workflowUuid"
                  onChange={(event) => setWorkflowUuid(event.target.value)}
                  placeholder="e.g. 4f3a9c2e-1b8d-4a7e-9c12-3f5b6a8d2e10"
                  value={workflowUuid}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bodyJson">Body (JSON, optional)</Label>

                <Textarea
                  className="font-mono text-sm"
                  id="bodyJson"
                  onChange={(event) => setBodyJson(event.target.value)}
                  rows={10}
                  value={bodyJson}
                />
              </div>

              <Button disabled={loading} type="submit">
                {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Execute Workflow
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>
              The response from the request trigger will appear here.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground">Executing...</p>
            )}

            {error && (
              <pre className="overflow-auto rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </pre>
            )}

            {result && (
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                {result}
              </pre>
            )}

            {!loading && !error && !result && (
              <p className="text-sm text-muted-foreground">
                Submit the form to execute the workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
