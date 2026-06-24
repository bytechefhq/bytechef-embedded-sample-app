import Link from "next/link";
import {
  FoldersIcon,
  MessageCircleIcon,
  SquareIcon,
  WebhookIcon,
  WorkflowIcon,
  ZapIcon
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pages = [
  {
    description: "Call any component action via the embedded API and inspect the raw execution result.",
    href: "/component-kit",
    icon: FoldersIcon,
    name: "ComponentKit Playground"
  },
  {
    description: "Dispatch application events to trigger workflows and watch how they respond.",
    href: "/app-event",
    icon: ZapIcon,
    name: "App Event Playground"
  },
  {
    description: "Execute a workflow by sending it a request, then view the returned payload.",
    href: "/request",
    icon: WebhookIcon,
    name: "Request Playground"
  },
  {
    description: "Chat with an assistant backed by the embedded MCP server and its available tools.",
    href: "/chat-mcp",
    icon: MessageCircleIcon,
    name: "MCP Chat"
  },
  {
    description: "Chat with an assistant powered by ComponentKit to explore and build workflows.",
    href: "/chat-component-kit",
    icon: MessageCircleIcon,
    name: "ComponentKit Chat"
  },
  {
    description: "Browse, create, and manage the automation workflows available in this workspace.",
    href: "/automations",
    icon: WorkflowIcon,
    name: "Automations"
  },
  {
    description: "Connect and configure third-party integrations for connected users.",
    href: "/integrations",
    icon: SquareIcon,
    name: "Integrations"
  }
];

export default function HomePage() {
  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <p className="mt-1 text-muted-foreground">
        An overview of everything you can explore in this embedded sample app.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className="block">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-x-2">
                  <page.icon className="h-5 w-5 shrink-0" aria-hidden="true" />

                  {page.name}
                </CardTitle>

                <CardDescription>{page.description}</CardDescription>
              </CardHeader>

              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
