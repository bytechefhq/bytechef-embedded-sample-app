import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";

// Rendered in place of a code playground while BYTECHEF_PLATFORM_API_KEY is not set. It never shows the key itself.
export function SetupInstructionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up a Platform API Key</CardTitle>

        <CardDescription>
          Deploying a code workflow is an administrator operation, so this page calls ByteChef from the Next.js server
          with an administrator&rsquo;s Embedded API key instead of the connected-user token. The key never reaches the
          browser.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Sign in to ByteChef at <code>{BYTECHEF_APP_BASE_URL}</code> as an administrator and switch to the{" "}
            <strong>{BYTECHEF_ENVIRONMENT}</strong> environment: an API key belongs to the environment it was created in.
          </li>

          <li>
            Open <strong>Embedded &rsaquo; Settings &rsaquo; API Keys</strong> (<code>/embedded/settings/api-keys</code>
            ) and create a key. An organization key from <strong>Settings &rsaquo; Organization &rsaquo; Admin API
            Keys</strong> does not work: the deploy endpoints reject it.
          </li>

          <li>
            Add it to <code>front-end/.env.local</code> without a <code>NEXT_PUBLIC_</code> prefix:
          </li>
        </ol>

        <pre className="overflow-auto rounded-md bg-muted p-4">BYTECHEF_PLATFORM_API_KEY=&lt;your API key&gt;</pre>

        <p>Restart the front-end and reload this page.</p>
      </CardContent>
    </Card>
  );
}
