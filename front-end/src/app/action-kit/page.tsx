"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

const input = {
  "model": "gpt-4o",
  "format": "ADVANCED",
  "messages": [
    {
      "role": "USER",
      "content": "Say hello"
    }
  ],
  "response": {
    "responseFormat": "TEXT"
  }
}

export default function ActionKitPage() {
  const [componentName, setComponentName] = useState("openai");
  const [componentVersion, setComponentVersion] = useState(1);
  const [actionName, setActionName] = useState("ask");
  const [inputJson, setInputJson] = useState(JSON.stringify(input, null, 2));
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const input = JSON.parse(inputJson);

      const response = await fetch("/api/action-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionName,
          componentName,
          componentVersion,
          input,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(JSON.stringify(data, null, 2));
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON input");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-bold">ActionKit Playground</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Execute Action</CardTitle>

            <CardDescription>
              Call any component action via the embedded API.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <fieldset className="flex gap-4 border-0 p-0">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="componentName">Component Name</Label>

                  <Input
                    id="componentName"
                    onChange={(event) => setComponentName(event.target.value)}
                    placeholder="e.g. openai"
                    value={componentName}
                  />
                </div>

                <div className="flex w-24 flex-col gap-2">
                  <Label htmlFor="componentVersion">Version</Label>

                  <Input
                    id="componentVersion"
                    min={1}
                    onChange={(event) => setComponentVersion(Number(event.target.value))}
                    type="number"
                    value={componentVersion}
                  />
                </div>
              </fieldset>

              <div className="flex flex-col gap-2">
                <Label htmlFor="actionName">Action Name</Label>

                <Input
                  id="actionName"
                  onChange={(event) => setActionName(event.target.value)}
                  placeholder="e.g. ask"
                  value={actionName}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="inputJson">Input (JSON)</Label>

                <Textarea
                  className="font-mono text-sm"
                  id="inputJson"
                  onChange={(event) => setInputJson(event.target.value)}
                  rows={10}
                  value={inputJson}
                />
              </div>

              <Button disabled={loading} type="submit">
                {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Execute Action
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>

            <CardDescription>
              Action execution response will appear here.
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
                Submit the form to see results.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
