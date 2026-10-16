// Starter sources for the code playgrounds, adapted from the bytechef-embedded-automation-sample-code-workflow-javascript
// and bytechef-embedded-integration-sample-code-workflow-javascript samples. The project name and descriptions are
// changed so a playground deploy does not overwrite a project deployed from the standalone sample.

export const automationStarterSource = `({
    name: "Playground Catalog Greeting",
    version: "1",
    description: "A catalog code project deployed from the Automation Code Playground.",
    workflows: [
        {
            name: "greetOnRequest",
            label: "Greet on Request",
            description: "Answers a request with a greeting.",
            // A request trigger makes the workflow callable through the embedded public endpoints.
            // awaitWorkflowAndRespond makes Run return the workflow outputs instead of an empty 200.
            triggers: [{name: "request", type: "request/v1/awaitWorkflowAndRespond"}],
            outputs: [{name: "greeting", task: "greet"}],
            tasks: [
                {
                    name: "greet",
                    label: "Greet",
                    perform: function (context) {
                        context.log("info", "Greeting from the Automation Code Playground");

                        return "Hello from the Automation Code Playground";
                    }
                }
            ]
        },
        {
            name: "summarizeNewEmail",
            label: "Summarize New Email",
            description: "Runs for every new email in the connected user's inbox and logs who sent it.",
            // Provisioning binds the Gmail trigger to one of the connected user's Gmail connections - connect the
            // Gmail integration first. It has no request trigger, so Run cannot call it: once provisioned and enabled
            // it runs whenever an email arrives.
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "summary", task: "summarize"}],
            tasks: [
                {
                    name: "summarize",
                    label: "Summarize",
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const summary = "New email from " + email.from + ": " + email.subject;

                        context.log("info", summary);

                        return summary;
                    }
                }
            ]
        },
        {
            name: "fetchRecentEmails",
            label: "Fetch Recent Emails",
            description: "Returns the connected user's most recent emails, optionally only those from one sender.",
            triggers: [{name: "request", type: "request/v1/awaitWorkflowAndRespond"}],
            outputs: [{name: "emails", task: "fetchEmails"}],
            tasks: [
                {
                    name: "fetchEmails",
                    label: "Fetch Emails",
                    // A code task's perform calls actions itself, so it declares the connections it uses; the name is
                    // what perform passes to the action. Provisioning binds each one to a connection of the connected
                    // user on the same component.
                    connections: [{componentName: "googleMail", name: "gmail"}],
                    perform: function (context) {
                        const request = context.input()["request"] || {};
                        const body = request.body || {};

                        const result = context.component.googleMail.searchEmail(
                            {from: body.from, maxResults: body.maxResults || 10}, "gmail");

                        context.log("info", "Found " + (result.messages || []).length + " emails");

                        return result.messages || [];
                    }
                }
            ]
        },
        {
            name: "notifySlackOnNewEmail",
            label: "Notify Slack on New Email",
            description: "Posts every new email in the connected user's inbox to a Slack channel.",
            inputs: [{name: "channel", label: "Slack Channel ID", type: "STRING", required: true}],
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "message", task: "postToSlack"}],
            tasks: [
                {
                    name: "postToSlack",
                    label: "Post to Slack",
                    description: "Posts the sender and subject with the Slack Send Channel Message action.",
                    // The Gmail trigger needs no declaration, but the task calls Slack itself, so it declares
                    // that connection and passes the name. Provisioning binds it to one of the connected user's
                    // Slack connections.
                    connections: [{componentName: "slack", name: "slack"}],
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const text = "New email from " + email.from + ": " + email.subject;

                        const message = context.component.slack.sendChannelMessage(
                            {channel: context.input("channel"), text: text}, "slack");

                        context.log("info", "Posted to Slack: " + text);

                        return message;
                    }
                }
            ]
        }
    ]
})
`;

export const automationStarterFileName = "playground_catalog_greeting";

// A code integration is keyed by its component, so a playground deploy and a deploy of the standalone sample
// (both on googleMail) update the same integration.
export const integrationStarterSource = `({
    componentName: "googleMail",
    componentVersion: 1,
    version: "0.0.1",
    description: "A code integration deployed from the Integration Code Playground.",
    workflows: [
        {
            name: "summarizeNewEmail",
            label: "Summarize New Email",
            description: "Runs for every new email in the connected user's inbox and logs who sent it.",
            // A Gmail trigger on a Gmail integration runs on the connection the connected user created when they
            // connected the integration - nothing to declare. It needs no call: once enabled it runs on its own.
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "summary", task: "summarize"}],
            tasks: [
                {
                    name: "summarize",
                    label: "Summarize",
                    description: "Builds a one-line summary of the new email.",
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const summary = "New email from " + email.from + ": " + email.subject;

                        context.log("info", summary);

                        return summary;
                    }
                }
            ]
        },
        {
            name: "fetchRecentEmails",
            label: "Fetch Recent Emails",
            description: "Returns the connected user's most recent emails, optionally only those from one sender.",
            // awaitWorkflowAndRespond makes Run return the workflow outputs.
            triggers: [{name: "request", type: "request/v1/awaitWorkflowAndRespond"}],
            outputs: [{name: "emails", task: "fetchEmails"}],
            tasks: [
                {
                    name: "fetchEmails",
                    label: "Fetch Emails",
                    description: "Searches the inbox with the Gmail Search Email action.",
                    // A call to the integration's own component needs no declared connection: it runs on the connected
                    // user's integration connection. Declare and name only connections to other components.
                    perform: function (context) {
                        const request = context.input()["request"] || {};
                        const body = request.body || {};

                        const result = context.component.googleMail.searchEmail(
                            {from: body.from, maxResults: body.maxResults || 10});

                        context.log("info", "Found " + (result.messages || []).length + " emails");

                        return result.messages || [];
                    }
                }
            ]
        },
        {
            name: "notifySlackOnNewEmail",
            label: "Notify Slack on New Email",
            description: "Posts every new email in the connected user's inbox to a Slack channel.",
            inputs: [{name: "channel", label: "Slack Channel ID", type: "STRING", required: true}],
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "message", task: "postToSlack"}],
            tasks: [
                {
                    name: "postToSlack",
                    label: "Post to Slack",
                    description: "Posts the sender and subject with the Slack Send Channel Message action.",
                    // Slack is not the integration's component, so the task declares its connection and
                    // passes the name. An administrator picks the Slack connection when enabling the
                    // workflow in the integration's instance configuration.
                    connections: [{componentName: "slack", name: "slack"}],
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const text = "New email from " + email.from + ": " + email.subject;

                        const message = context.component.slack.sendChannelMessage(
                            {channel: context.input("channel"), text: text}, "slack");

                        context.log("info", "Posted to Slack: " + text);

                        return message;
                    }
                }
            ]
        }
    ]
})
`;

export const integrationStarterFileName = "playground_code_integration";
