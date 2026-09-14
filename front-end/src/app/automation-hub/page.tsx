import { AutomationHub } from "@bytechef/embedded";
import {getToken} from "@/lib/api";
import {BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT, BYTECHEF_SHARED_CONNECTION_IDS} from "@/lib/config";

export default async function AutomationHubPage() {
  const jwtToken = await getToken();

  return (
    <div className="absolute inset-0 flex flex-col bg-muted lg:pl-72">
      <header className="p-4">
        <h1 className="text-xl font-semibold">Automation Hub</h1>
      </header>

      <AutomationHub
        baseUrl={BYTECHEF_APP_BASE_URL}
        className="min-h-0 flex-1"
        connectionDialogAllowed={true}
        environment={BYTECHEF_ENVIRONMENT}
        jwtToken={jwtToken}
        sharedConnectionIds={BYTECHEF_SHARED_CONNECTION_IDS} />
    </div>
  );
}
