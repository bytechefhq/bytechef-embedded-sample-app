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
            inputs: [
                {
                    name: "channel", label: "Slack Channel", type: "STRING", required: true,
                    componentName: "slack", componentVersion: 1, groupName: "channel"
                }
            ],
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "message", task: "postToSlack"}],
            tasks: [
                {
                    name: "postToSlack",
                    label: "Post to Slack",
                    description: "Posts the sender and subject with the Slack Send Channel Message action.",
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
            triggers: [{name: "request", type: "request/v1/awaitWorkflowAndRespond"}],
            outputs: [{name: "emails", task: "fetchEmails"}],
            tasks: [
                {
                    name: "fetchEmails",
                    label: "Fetch Emails",
                    description: "Searches the inbox with the Gmail Search Email action.",
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
            inputs: [
                {
                    name: "channel", label: "Slack Channel", type: "STRING", required: true,
                    componentName: "slack", componentVersion: 1, groupName: "channel"
                }
            ],
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "message", task: "postToSlack"}],
            tasks: [
                {
                    name: "postToSlack",
                    label: "Post to Slack",
                    description: "Posts the sender and subject with the Slack Send Channel Message action.",
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
