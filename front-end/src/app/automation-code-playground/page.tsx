import { AutomationCodePlayground } from "@/app/automation-code-playground/automation-code-playground";
import { SetupInstructionsCard } from "@/components/code-playground/setup-instructions-card";
import { isPlatformApiKeyConfigured } from "@/lib/server-config";

// Read BYTECHEF_PLATFORM_API_KEY on every request rather than once at build time.
export const dynamic = "force-dynamic";

export default function AutomationCodePlaygroundPage() {
  if (!isPlatformApiKeyConfigured()) {
    return (
      <div className="flex w-full flex-col gap-6">
        <h1 className="text-xl font-semibold">Automation Code Playground</h1>

        <SetupInstructionsCard />
      </div>
    );
  }

  return <AutomationCodePlayground />;
}
