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

    if (response.status === 401 || response.status === 403) {
        throw new Error(
            `ByteChef rejected the chat's token for the ${environment} environment. Check that the token is valid ` +
                "and was signed for the same environment as the component's environment prop."
        );
    }

    if (!response.ok) {
        throw new Error(`Failed to create workflow: ${response.status}`);
    }

    return (await response.text()).replace(/"/g, '').trim();
};
