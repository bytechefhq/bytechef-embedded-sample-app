import { AutomationHub } from "@bytechef/embedded";
import {getToken} from "@/lib/api";

export default async function AutomationHubPage() {
  const jwtToken = await getToken();

  return (
    <div className="absolute inset-0 lg:pl-72">
      <AutomationHub
        baseUrl={`${process.env.BYTECHEF_APP_BASE_URL??'http://127.0.0.1:5173'}`}
        className="size-full"
        connectionDialogAllowed={true}
        environment={'DEVELOPMENT'}
        jwtToken={jwtToken}
        sharedConnectionIds={[1072]} />
    </div>
  );
}
