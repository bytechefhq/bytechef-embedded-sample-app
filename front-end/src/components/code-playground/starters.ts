// Starter sources for the code playgrounds, copied from the bytechef-embedded-automation-sample-code-workflow-javascript
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
            // A catalog workflow is only reachable through the embedded public endpoints when it declares a
            // request trigger or an app-event trigger. Without one the import still succeeds, with a warning.
            triggers: [{name: "request", type: "request/v1/autoRespondWithHTTP200"}],
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
        }
    ]
})
`;

export const automationStarterFileName = "playground_catalog_greeting";

// A code integration is keyed by its component, so a playground deploy and a deploy of the standalone sample
// (both on httpClient) update the same integration.
export const integrationStarterSource = `({
    componentName: "httpClient",
    componentVersion: 1,
    version: "0.0.1",
    description: "A code integration deployed from the Integration Code Playground.",
    workflows: [
        {
            name: "playgroundEchoMessage",
            label: "Playground Echo Message",
            description: "Returns the message it was given, upper-cased.",
            inputs: [{name: "message", label: "Message", type: "STRING", required: true}],
            outputs: [{name: "result", task: "shout"}],
            tasks: [
                {
                    name: "shout",
                    label: "Shout",
                    description: "Upper-cases the message.",
                    perform: function (context) {
                        return String(context.input("message")).toUpperCase();
                    }
                }
            ]
        }
    ]
})
`;

export const integrationStarterFileName = "playground_code_integration";
