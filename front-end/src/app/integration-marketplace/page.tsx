'use client';

import { IntegrationMarketplace } from "@bytechef/embedded";
import { getToken } from "@/lib/api";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";
import { useEffect, useState } from "react";

export default function IntegrationMarketplacePage() {
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then(setJwtToken);
  }, []);

  if (!jwtToken) {
    return <div className="w-full p-4">Loading...</div>;
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-muted lg:pl-72">
      <header className="p-4">
        <h1 className="text-xl font-semibold">Integration Marketplace</h1>
      </header>

      <IntegrationMarketplace
        baseUrl={BYTECHEF_APP_BASE_URL}
        className="min-h-0 flex-1"
        environment={BYTECHEF_ENVIRONMENT}
        jwtToken={jwtToken}
        mapObjectFields={{
          Contacts: {
            objectTypes: {
              get: async ({executeAction, search}) => {
                const objects = (await executeAction('salesforce', 1, 'listObjects', {search})) as Array<{
                  id: string;
                  name: string;
                }>;

                return objects.map((object) => ({label: object.name, value: object.id}));
              },
            },
            integrationFields: {
              get: async ({executeAction, objectType}) => {
                const fields = (await executeAction('salesforce', 1, 'listObjectFields', {objectType})) as Array<{
                  id: string;
                  label: string;
                }>;

                return fields.map((field) => ({label: field.label, value: field.id}));
              },
            },
            applicationFields: {
              fields: [
                {label: 'Title', value: 'title'},
                {label: 'Email', value: 'email'},
              ],
              defaultFields: [],
              userCanCreateFields: true,
              userCanRemoveMappings: true,
            },
          },
        }} />
    </div>
  );
}
