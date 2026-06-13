'use client';

interface JsonPreviewProps {
  json: string;
}

export default function JsonPreview({json}: JsonPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Workflow Definition</h2>

      <pre className="max-h-[calc(100vh-10rem)] overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
        <code>{json}</code>
      </pre>
    </div>
  );
}
