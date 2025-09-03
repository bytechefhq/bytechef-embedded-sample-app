// API utility functions for making authenticated requests

// Store token in memory
let authToken: string | null = null;

// Default configuration
const DEFAULT_BACKEND_APP_BASE_URL = 'http://localhost:3001';
const DEFAULT_BYTECHEF_APP_BASE_URL = 'http://localhost:5173';

const DEFAULT_USER_PAYLOAD = {
    externalUserId: '1234567890',
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
