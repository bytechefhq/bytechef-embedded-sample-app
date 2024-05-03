'use client';

import {useEffect, useState} from "react";
import ReactSVG from "react-inlinesvg";

interface Integration {
  category: string;
  description: string;
  icon: string;
  title: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[] | undefined>();
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:9555/api/embedded/v1/integrations', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImNIVmliR2xqT21GTFpEWmFaMXBqTkhWcFRqUmhRa0pGV1daTlltVnFNMEZ1WVdkd1ltOU8ifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.jKFzMD3fynYAEPQbL0hrfuoIN86UwbIbv7FExEUCWhYRzYhEcUBa01sB4jFsxNt3wJe_QH1Y-NCGwbp2D4TvAoS7dCi4w9FoRdUuabRqELHlwvOEpHg5ebQ6xlSeGOtzvHZv7dDQ4_2ry5x85TKHZzdZ9UmC2NcRndTP65_Na89wO7LH6Adrr4mKCHyz_yHNuK4YHUeawM0bgNQaCCS03ivHzegRAAttWQF9oRxAIfs9-cv3VnKC030j9oTri6iK6w7YFWQpOIPp8PN83TrhdHTs2g1Q5SDzb44OiQv8NEBPVd018Ss61Yt2d0xoTj7usrIJxJH25qNirHSGTtJFpg',
        'X-ENVIRONMENT': 'development'
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
            {integrations && integrations.map((integration) => {
              return <li
                key={integration.title}
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
