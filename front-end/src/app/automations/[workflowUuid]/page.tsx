// import { EmbeddedWorkflowBuilder } from "@bytechef/embedded-react";
import EmbeddedWorkflowBuilder from "@/app/automations/[workflowUuid]/EmbeddedWorkflowBuilder";
import {getToken} from "@/lib/api";

export default async function AutomationPage({params}: {params: {workflowUuid: string}}) {
  const { workflowUuid } = await params;

  const jwtToken = await getToken();

  return <EmbeddedWorkflowBuilder
    baseUrl={`${process.env.BYTECHEF_APP_BASE_URL??'http://127.0.0.1:5173'}`}
    connectionDialogAllowed={true}
    environment={'DEVELOPMENT'}
    includeComponents={['slack', 'productboard', 'googleMail']}
    jwtToken={jwtToken}
    sharedConnectionIds={[1072]}
    workflowUuid={workflowUuid} />;
}
