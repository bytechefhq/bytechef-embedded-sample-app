import { AutomationHub } from "@bytechef/embedded";
import {getToken} from "@/lib/api";

export default async function AutomationHubPage() {
  const jwtToken = await getToken();

  return (
    <div className="absolute inset-0 flex flex-col bg-muted lg:pl-72">
      <header className="p-4">
        <h1 className="text-xl font-semibold">Automation Hub</h1>
      </header>

      <AutomationHub
        baseUrl={`${process.env.BYTECHEF_APP_BASE_URL??'http://127.0.0.1:5173'}`}
        className="min-h-0 flex-1"
        connectionDialogAllowed={true}
        environment={'DEVELOPMENT'}
        jwtToken={jwtToken}
        sharedConnectionIds={[1072]} />
    </div>
  );
}
