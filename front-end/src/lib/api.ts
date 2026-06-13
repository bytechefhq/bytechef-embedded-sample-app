// API utility functions for making authenticated requests

// Store token in memory
let authToken: string | null = null;

// Default configuration
const DEFAULT_BACKEND_APP_BASE_URL = 'http://localhost:3001';
const DEFAULT_BYTECHEF_APP_BASE_URL = 'http://localhost:5173';

const DEFAULT_USER_PAYLOAD = {
    externalUserId: process.env.NEXT_PUBLIC_BYTECHEF_EXTERNAL_USER_ID || '1234567890',
    name: 'John Doe'
} as const;

// Interface for token request payload
interface TokenRequestPayload {
    externalUserId: string;
    name: string;
}

interface TokenResponse {
    token: string;
}

// Workflow interfaces
export interface Workflow {
  description: string;
  enabled: boolean;
  label: string;
  name: string;
  workflowUuid?: string;
  workflowVersion?: number;
}

export interface CreateWorkflowPayload {
  label: string;
  description: string;
}

// Automation workflow project interfaces
export interface AutomationWorkflowProjectComponent {
  name: string;
  title: string;
  icon: string;
}

export interface AutomationWorkflowProjectWorkflowTemplate {
  id: string;
  label: string;
  description: string;
  components: AutomationWorkflowProjectComponent[];
}

export interface AutomationWorkflowProject {
  id: number;
  name: string;
  description: string;
  workflowTemplates: AutomationWorkflowProjectWorkflowTemplate[];
}

// A connection the user already created for a given component, returned by
// GET /api/embedded/v1/components/{componentName}/connections
export interface ComponentConnection {
  id: number;
  name: string;
}

/**
 * Fetch all workflows
 * @returns Promise that resolves to an array of workflows
 */
export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await fetchWithAuth('/api/embedded/v1/automation/workflows', {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflows: ${response.status}`);
  }

  return response.json();
}

/**
 * Enable or disable a workflow
 * @param workflowUuid The uuid of the workflow
 * @param enable Whether to enable or disable the workflow
 * @returns Promise that resolves to the fetch response
 */
export async function enableWorkflow(workflowUuid: string, enable: boolean): Promise<Response> {
  return fetchWithAuth(`/api/embedded/v1/automation/workflows/${workflowUuid}/enable`, {
    method: enable ? 'POST' : 'DELETE'
  });
}

/**
 * Delete a workflow
 * @param workflowUuid The uuid of the workflow
 * @returns Promise that resolves to the fetch response
 */
export async function deleteWorkflow(workflowUuid: string): Promise<Response> {
  return fetchWithAuth(`/api/embedded/v1/automation/workflows/${workflowUuid}`, {
    method: 'DELETE'
  });
}

/**
 * Create a new workflow
 * @param payload The workflow creation payload
 * @returns Promise that resolves to the fetch response
 */
export async function createWorkflow(payload: CreateWorkflowPayload): Promise<Response> {
  return fetchWithAuth('/api/embedded/v1/automation/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      definition: `{
        "label": "${payload.label}",
        "description": "${payload.description}",
        "triggers": [
          {
            "label": "Productboard",
            "name": "trigger_1",
            "parameters": {},
            "type": "productboard/v1/newNote"
          }
         ],
        "tasks": []
      }`
    })
  });
}

/**
 * Fetch all automation workflow projects (grouped by project, with their workflow templates)
 * @returns Promise that resolves to an array of automation workflow projects
 */
export async function fetchAutomationWorkflowProjects(): Promise<AutomationWorkflowProject[]> {
  const response = await fetchWithAuth('/api/embedded/v1/automation/projects', {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch automation workflow projects: ${response.status}`);
  }

  return response.json();
}

/**
 * Copy a workflow template into a new workflow for the current user
 * @param workflowUuid The uuid of the workflow template to copy
 * @returns Promise that resolves to the uuid of the newly created workflow
 */
export async function copyWorkflowTemplate(workflowUuid: string): Promise<string> {
  const response = await fetchWithAuth(`/api/embedded/v1/automation/workflow-templates/${workflowUuid}/copy`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to copy workflow template: ${response.status}`);
  }

  const newWorkflowUuid = (await response.text()).trim();

  // The endpoint may return the uuid as a JSON string or as plain text.
  return newWorkflowUuid.startsWith('"') && newWorkflowUuid.endsWith('"')
    ? newWorkflowUuid.slice(1, -1)
    : newWorkflowUuid;
}

/**
 * Generate a new workflow from a natural language prompt using AI Copilot
 * @param prompt Natural language description of the workflow to build
 * @returns Promise that resolves to the uuid of the newly created workflow
 */
export async function generateWorkflow(prompt: string): Promise<string> {
  const response = await fetchWithAuth('/api/embedded/v1/automation/workflows/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({prompt})
  });

  if (!response.ok) {
    throw new Error(`Failed to generate workflow: ${response.status}`);
  }

  const newWorkflowUuid = (await response.text()).trim();

  return newWorkflowUuid.startsWith('"') && newWorkflowUuid.endsWith('"')
    ? newWorkflowUuid.slice(1, -1)
    : newWorkflowUuid;
}

/**
 * Create a workflow from a raw ByteChef workflow-definition JSON string.
 *
 * This is the single call a custom builder needs to persist a workflow: the
 * embedded endpoint derives the user from the bearer token and returns the new
 * workflow's uuid. Backed by ConnectedUserProjectWorkflowApiController.createFrontendProjectWorkflow.
 *
 * @param definition A complete workflow-definition JSON string (see buildWorkflowDefinition)
 * @returns the new workflowUuid
 */
export async function createBuilderWorkflow(definition: string): Promise<string> {
  const response = await fetchWithAuth('/api/embedded/v1/automation/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({definition})
  });

  if (!response.ok) {
    throw new Error(`Failed to create workflow: ${response.status}`);
  }

  const workflowUuid = (await response.text()).trim();

  return workflowUuid.startsWith('"') && workflowUuid.endsWith('"')
    ? workflowUuid.slice(1, -1)
    : workflowUuid;
}

/**
 * List the connections the current user already has for a given component
 * (e.g. "googleMail", "slack").
 *
 * @param componentName the ByteChef component name
 * @returns the user's existing connections for that component
 */
export async function fetchComponentConnections(componentName: string): Promise<ComponentConnection[]> {
  const response = await fetchWithAuth(`/api/embedded/v1/components/${componentName}/connections`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch connections for ${componentName}: ${response.status}`);
  }

  return response.json();
}

/**
 * Bind an existing connection to a specific node of a saved workflow.
 *
 * The workflowConnectionKey is the connection key within the node; for the
 * single-connection components used here it equals the component name.
 * Backed by ConnectedUserProjectWorkflowApiController.updateFrontendWorkflowConfigurationConnection (HTTP PUT).
 *
 * @param workflowUuid uuid returned by createBuilderWorkflow
 * @param workflowNodeName the node's name in the definition (e.g. "trigger_1", "slack_1")
 * @param workflowConnectionKey the connection key (component name here)
 * @param connectionId the connection to bind
 */
export async function bindWorkflowNodeConnection(
  workflowUuid: string,
  workflowNodeName: string,
  workflowConnectionKey: string,
  connectionId: number
): Promise<Response> {
  return fetchWithAuth(
    `/api/embedded/v1/automation/workflows/${workflowUuid}/workflow-nodes/${workflowNodeName}/connection/${workflowConnectionKey}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({connectionId})
    }
  );
}

/**
 * Get the current token, fetching it if necessary
 * @returns Promise that resolves to the token
 */
export async function getToken(): Promise<string> {
  if (!authToken) {
    return fetchToken();
  }

  return authToken;
}

/**
 * Make an authenticated API request
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Promise that resolves to the fetch response
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'X-ENVIRONMENT': 'development'
  };

  return fetch(`${process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL??DEFAULT_BYTECHEF_APP_BASE_URL}${url}`, {
    ...options,
    headers,
    cache: options.cache || 'no-cache'
  });
}

/**
 * Fetch the authentication token from the backend
 * @param userPayload - User data for token request
 * @returns Promise that resolves to the token
 */
async function fetchToken(userPayload: TokenRequestPayload = DEFAULT_USER_PAYLOAD): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_APP_BASE_URL??DEFAULT_BACKEND_APP_BASE_URL}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userPayload),
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`);
    }

    const data: TokenResponse = await response.json();

    authToken = data.token;

    return authToken;
  } catch (error) {
    console.error('Error fetching token:', error);

    throw error;
  }
}
