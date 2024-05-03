'use client'

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ChartPieIcon,
  FilesIcon,
  FoldersIcon,
  HomeIcon,
  SquareIcon,
  UsersIcon,
  WorkflowIcon
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Team', href: '/team', icon: UsersIcon },
  { name: 'Projects', href: '/projects', icon: FoldersIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Documents', href: '/documents', icon: FilesIcon },
  { name: 'Reports', href: '/reports', icon: ChartPieIcon },
  { name: 'Automations', href: '/automations', icon: WorkflowIcon },
  { name: 'Integrations', href: '/integrations', icon: SquareIcon },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={inter.className}>
        <div>
          {/* Static sidebar for desktop */}
          <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary px-6">
              <div className="flex h-16 shrink-0 items-center">
                <img
                    className="h-8 w-auto"
                    src="/logo.svg"
                    alt="ACME Inc."
                />

                <span className="pl-2 text-white">ACME Inc.</span>
              </div>

              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={classNames(
                                isActive
                                  ? 'bg-gray-800 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                              )}
                            >
                              <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />

                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>

                  <li className="-mx-6 mt-auto">
                    <a
                      href="#"
                      className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-white hover:bg-gray-800"
                    >
                      <img
                        className="h-8 w-8 rounded-full bg-gray-800"
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />

                      <span className="sr-only">Your profile</span>

                      <span aria-hidden="true">Tom Cook</span>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          <main className="lg:pl-72">
            <div className="min-h-screen flex p-4">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
