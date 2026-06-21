import {SKELETON_WORKFLOW_DEFINITION, createWorkflowUrl} from './constants';

interface CreateSkeletonWorkflowParamsI {
    baseUrl: string;
    environment: string;
    jwtToken: string;
}

export const createSkeletonWorkflow = async ({
    baseUrl,
    environment,
    jwtToken,
}: CreateSkeletonWorkflowParamsI): Promise<string> => {
    const response = await fetch(createWorkflowUrl(baseUrl), {
        body: JSON.stringify({definition: SKELETON_WORKFLOW_DEFINITION}),
        headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
            'X-Environment': environment,
        },
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Failed to create workflow: ${response.status}`);
    }

    return (await response.text()).replace(/"/g, '').trim();
};
