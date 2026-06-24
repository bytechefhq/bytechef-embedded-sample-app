import {createContext, useContext} from 'react';

/**
 * Connection details the chat's data components need to reach the embedded API directly (e.g. the
 * create-connection card opening the ConnectDialog). Provided by EmbeddedWorkflowChat so the dataComponents,
 * which render deep inside the assistant-ui thread, don't have to be threaded the values through props.
 */
export interface EmbeddedChatConfigI {
    baseUrl: string;
    environment: string;
    jwtToken: string;
}

export const EmbeddedChatConfigContext = createContext<EmbeddedChatConfigI | null>(null);

export const useEmbeddedChatConfig = (): EmbeddedChatConfigI | null => useContext(EmbeddedChatConfigContext);
