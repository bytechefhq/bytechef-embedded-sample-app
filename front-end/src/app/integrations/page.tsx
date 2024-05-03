'use client';

import {useEffect, useState} from "react";
import ReactSVG from "react-inlinesvg";

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
    fetch('http://localhost:9555/api/embedded/v1/frontend/integrations', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImNIVmliR2xqT2pFNFltSnFVVVpHVm00NU9WUm5UblZXU2pkRlNtdFplVnBWYUZOUlkzWlAifQ.eyJzdWIiOiIxMjM0NiIsIm5hbWUiOiJKb2huIERvZSIsImFkbWluIjp0cnVlLCJpYXQiOjE3NDcwODMyNTl9.Ctp7qBBE4ShbIkgN0d7uDoXUopyof5yP7N4eIhmZhBaUgC0u_Q7T5dfDOm1vZK5Rk_QuRxJldsmBNDrPddthWcxGmwwxZ72xYMMAw1XrZcd4nKN7g6WTzGOxHTGGIya4dJuH4yFeleVeZCf9n8_fsUVlvfxLdRseAf_eSB4xm3UVV-CacALy7O27aGev61BUhAYnna8X3AiLUnSX2KZ7GQEEKYYSyIZIvhroVVC7q-M16N_pgNEQWKjVTrtwZbHQ7o6Ef8lMhyKvT-Xvci1Hs6pBS5L8wUGIkwPihjVQXGkSv06ELEWbDzTRPJ04ljlzNbSgAwjI7351ZYnxz5dkTg',
        'x-environment': 'development'
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
              return <li
                key={integration.title}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-center py-8">
                    <ReactSVG src={integration.icon} />
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
