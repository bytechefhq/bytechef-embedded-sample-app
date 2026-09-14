import { EmbeddedWorkflowBuilder } from "@bytechef/embedded";
import {getToken} from "@/lib/api";
import {BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT, BYTECHEF_SHARED_CONNECTION_IDS} from "@/lib/config";

export default async function AutomationPage({params}: {params: {workflowUuid: string}}) {
  const { workflowUuid } = await params;

  const jwtToken = await getToken();

  return <EmbeddedWorkflowBuilder
    baseUrl={BYTECHEF_APP_BASE_URL}
    connectionDialogAllowed={true}
    environment={BYTECHEF_ENVIRONMENT}
    jwtToken={jwtToken}
    sharedConnectionIds={BYTECHEF_SHARED_CONNECTION_IDS}
    workflowUuid={workflowUuid} />;
}
