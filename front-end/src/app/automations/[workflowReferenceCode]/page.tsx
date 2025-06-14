// import { EmbeddedWorkflowBuilder } from "@bytechef/embedded-react";
import EmbeddedWorkflowBuilder from "@/app/automations/[workflowReferenceCode]/EmbeddedWorkflowBuilder";
import {getToken} from "@/lib/api";

export default async function AutomationPage({params}: {params: {workflowReferenceCode: string}}) {
  const workflowReferenceCode = params.workflowReferenceCode as string;

  const jwtToken = await getToken();

  return <EmbeddedWorkflowBuilder
    baseUrl={`${process.env.BYTECHEF_APP_BASE_URL??'http://127.0.0.1:5173'}`}
    connectionDialogAllowed={true}
    environment={'DEVELOPMENT'}
    includeComponents={['slack', 'productboard', 'googleMail']}
    jwtToken={jwtToken}
    sharedConnectionIds={[1072]}
    workflowReferenceCode={workflowReferenceCode} />;
}
