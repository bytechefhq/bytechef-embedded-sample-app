'use client';

import {useCallback, useEffect, useState} from "react";
import ReactSVG from "react-inlinesvg";
import {useConnectDialog} from "@bytechef/embedded-react";
import {getToken} from "@/lib/api";

const BYTECHEF_APP_BASE_URL = process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL || 'http://localhost:5173';
const BYTECHEF_ENVIRONMENT = process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT || 'DEVELOPMENT';

interface IntegrationI {
  category: string;
  description: string;
  icon: string;
  id: number;
  integrationInstances: unknown[];
  title: string;
}

function ConnectDialogOpener({integrationId, jwtToken, onDone}: {integrationId: string; jwtToken: string; onDone: () => void}) {
  const {openDialog, closeDialog} = useConnectDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    integrationId,
    jwtToken,
  });

  useEffect(() => {
    openDialog();

    const observer = new MutationObserver(() => {
      const portal = document.getElementById('connect-dialog-portal');

      if (portal && portal.childNodes.length === 0) {
        onDone();
      }
    });

    const portal = document.getElementById('connect-dialog-portal');

    if (portal) {
      observer.observe(portal, {childList: true});
    }

    return () => {
      observer.disconnect();
      closeDialog();
    };
  }, []);

  return null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationI[] | undefined>();
  const [isLoading, setLoading] = useState(true);
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async (token: string) => {
    const response = await fetch(`${BYTECHEF_APP_BASE_URL}/api/embedded/v1/integrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-ENVIRONMENT': BYTECHEF_ENVIRONMENT
      },
      cache: "no-cache"
    });

    const data = await response.json();

    setIntegrations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    getToken().then((token) => {
      setJwtToken(token);

      fetchIntegrations(token);
    });
  }, [fetchIntegrations]);

  if (isLoading) {
    return <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4 w-full max-w-5xl">
        <div className="w-full flex justify-between items-center py-4">
          Loading...
        </div>
      </div>
    </div>;
  }

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4">
        <div className="w-full text-xl font-semibold py-4">Integrations</div>

        <div className="flex-1">
          <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {integrations && integrations.map((integration) => (
              <li
                key={integration.id}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-center py-8">
                    <ReactSVG className="h-16" src={integration.icon} />
                  </div>

                  <h3 className="text-sm font-medium text-gray-900">{integration.title}</h3>

                  <dl className="mt-1 flex flex-grow flex-col justify-between">
                    <dt className="sr-only">Description</dt>

                    <dd className="text-sm text-gray-500 max-w-52 line-clamp-3">{integration.description}</dd>

                    <dt className="sr-only">Category</dt>

                    <dd className="mt-3">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {integration.category ?? 'Other'}
                      </span>
                    </dd>
                  </dl>
                </div>
                <div>
                  <div className="-mt-px flex divide-x divide-gray-200">
                    <div className="flex w-0 flex-1">
                      <button
                        onClick={() => setActiveIntegrationId(String(integration.id))}
                        className={`relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold ${integration.integrationInstances?.length > 0 ? 'text-green-700' : 'text-gray-900'}`}
                      >
                        {integration.integrationInstances?.length > 0 ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {activeIntegrationId && jwtToken && (
        <ConnectDialogOpener
          key={activeIntegrationId}
          integrationId={activeIntegrationId}
          jwtToken={jwtToken}
          onDone={() => {
            if (jwtToken) {
              fetchIntegrations(jwtToken);
            }

            setActiveIntegrationId(null);
          }}
        />
      )}
    </div>
  );
}
