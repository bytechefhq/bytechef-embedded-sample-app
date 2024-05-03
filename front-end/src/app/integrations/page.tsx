'use client';

import {useEffect, useState} from "react";

interface Integration {
  category: string;
  description: string;
  icon: string;
  title: string;
}

export default function Home() {
  const [integrations, setIntegrations] = useState<Integration[] | undefined>();
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:9555/api/embedded/frontend/v1/integrations', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImNIVmliR2xqT2s4M1pVWmtXRlZCWmpCSVJGRXpOMlE1Y0dOQmVGVnlNVEpOU1dzdlNIUjAifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.cBek7AcrbY_OiZPSzbswHHhriBYnV2h30E-n7uRqYcT8pD_LNOo-0fdhLkHalg9oyQrxmWDODFVE1b29Olo5nf3-xtb3Y3PFIIkyVMAKFT-XgH02_yb6oLcVhOceJe01rQ_MUX7-WjvPtvZZ2nvaVlrouq6ow1I-ToJXMinLkquzf6WYONUj-vjqRAGJH243jjFK0mOO_c_jlOSQxJicKAYiQ6R_ltNvZidcKjR3gjDrei04w_hLpiEwHE6rMKot6H2b4FaIILEEePCLG70BrO9CF-7xrnp4-2fkn3RSiMV_4zIFCUbX-0ITOepy8X2WER7cbzWNlMSTtM6hkFqA4A',
        'x-environment': 'test'
      },
      cache: "no-cache"
    })
      .then((res) => res.json())
      .then((data) => {
        setIntegrations(data)
        setLoading(false)
      })
  }, []);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col gap-4">
        <div className="w-full text-xl font-semibold py-4">Integrations</div>

        <div className="flex-1">
          <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {integrations && integrations.map((integration) => {
              const icon = new Buffer(integration.icon);

              return <li
                key={integration.title}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="px-16 py-8">
                    <img
                      className="mx-auto h-16 w-16 flex-shrink-0 rounded-full"
                      src={`data:image/svg+xml;base64,${icon.toString('base64')}`} alt={integration.title} />
                  </div>

                  <h3 className="text-sm font-medium text-gray-900">{integration.title}</h3>

                  <dl className="mt-1 flex flex-grow flex-col justify-between">
                    <dt className="sr-only">Description</dt>

                    <dd className="text-sm text-gray-500 max-w-52 line-clamp-3">{integration.description}</dd>

                    <dt className="sr-only">Category</dt>

                    <dd className="mt-3">
                      <span
                        className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {integration.category??'Other'}
                      </span>
                    </dd>
                  </dl>
                </div>
                <div>
                  <div className="-mt-px flex divide-x divide-gray-200">
                    <div className="flex w-0 flex-1">
                      <a
                        href="#"
                        className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                      >
                        Connect
                      </a>
                    </div>
                  </div>
                </div>
              </li>
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
