/* eslint-disable react-refresh/only-export-components */
import {type DataMessagePartProps, useThreadRuntime} from '@assistant-ui/react';
import {useConnectDialog} from '@bytechef/embedded';
import {AlertCircleIcon, CheckIcon, PlugIcon} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useEmbeddedChatConfig} from './chat-config-context';

export interface AskUserQuestionOptionDataI {
    description?: string;
    label: string;
}

export interface AskUserQuestionDataI {
    awaitingAnswer?: boolean;
    kind: 'ask-user-question';
    questions: Array<{
        header?: string;
        multiSelect: boolean;
        options: AskUserQuestionOptionDataI[];
        question: string;
    }>;
}

/**
 * Stable fingerprint over the questions array for tracking answered state across re-renders.
 */
function fingerprintQuestions(questions: AskUserQuestionDataI['questions']): string {
    return questions
        .map((question) => `${question.question}::${question.options.map((option) => option.label).join(',')}`)
        .join('||');
}

/**
 * Minimal wizard rendering the LLM's ask-user-question data part.
 * Single question: renders directly. Multiple questions: walks the user through one at a time.
 * Connection pickers are out of scope for v1.
 */
const AskUserQuestionMessage = ({data}: DataMessagePartProps<AskUserQuestionDataI>) => {
    const questions = useMemo(() => data.questions ?? [], [data.questions]);
    const fingerprint = useMemo(() => fingerprintQuestions(questions), [questions]);

    const [answered, setAnswered] = useState<{fingerprint: string; summary: string} | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});

    const threadRuntime = useThreadRuntime();

    if (questions.length === 0) {
        return null;
    }

    if (answered?.fingerprint === fingerprint) {
        return <AnsweredSummary summary={answered.summary} />;
    }

    const totalSteps = questions.length;
    const currentQuestion = questions[stepIndex];
    const isLastStep = stepIndex === totalSteps - 1;

    const submitStep = (answer: string) => {
        const nextAnswers = {...answers, [stepIndex]: answer};

        setAnswers(nextAnswers);

        if (!isLastStep) {
            setStepIndex(stepIndex + 1);

            return;
        }

        const summary =
            totalSteps === 1
                ? answer
                : questions
                      .map(
                          (question: AskUserQuestionDataI['questions'][number], index: number) =>
                              `- ${question.question} → ${nextAnswers[index] ?? ''}`
                      )
                      .join('\n');

        const messageText = totalSteps === 1 ? `User picked: ${answer}` : `User picked:\n${summary}`;

        setAnswered({fingerprint, summary});

        // The selected answer is appended through the runtime; onNew normalizes it to a user-role message,
        // so it reaches the agent on the next turn and appears as a user bubble (consistent with the web Copilot).
        threadRuntime.append({
            content: [{text: messageText, type: 'text'}],
            role: 'system',
        });
    };

    return (
        <div className="mt-2 flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
            {totalSteps > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Question {stepIndex + 1} of {totalSteps}
                    </span>

                    {currentQuestion.header && (
                        <span className="font-semibold uppercase">{currentQuestion.header}</span>
                    )}
                </div>
            )}

            {totalSteps === 1 && currentQuestion.header && (
                <div className="text-xs font-semibold text-muted-foreground uppercase">{currentQuestion.header}</div>
            )}

            <div className="text-sm">{currentQuestion.question}</div>

            {/* v1: all questions rendered as single-select; the multiSelect flag is not yet honored. */}
            <div className="flex flex-col items-start gap-2">
                {currentQuestion.options.map((option: AskUserQuestionOptionDataI) => (
                    <button
                        key={option.label}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors cursor-pointer"
                        title={option.description}
                        type="button"
                        onClick={() => submitStep(option.label)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {stepIndex > 0 && (
                <div className="flex justify-end">
                    <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        type="button"
                        onClick={() => setStepIndex(stepIndex - 1)}
                    >
                        ← Previous
                    </button>
                </div>
            )}
        </div>
    );
};

const AnsweredSummary = ({summary}: {summary: string}) => {
    const isMultiLine = summary.includes('\n');

    if (!isMultiLine) {
        return (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <CheckIcon className="size-4 text-emerald-600" />

                <span>
                    Picked: <span className="font-medium">{summary}</span>
                </span>
            </div>
        );
    }

    return (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />

            <div className="flex flex-col gap-1">
                <span className="font-medium">Picked:</span>

                <pre className="font-sans text-xs whitespace-pre-wrap text-muted-foreground">{summary}</pre>
            </div>
        </div>
    );
};

export interface RunErrorDataI {
    message: string;
}

/**
 * Renders a RUN_ERROR inline as a red left-border callout so the failure reads as a distinct
 * system error rather than a regular assistant reply.
 */
const RunErrorMessage = ({data}: DataMessagePartProps<RunErrorDataI>) => {
    return (
        <div
            className="my-2 flex items-start gap-2 rounded-md border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            data-testid="embedded-run-error"
            role="alert"
        >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />

            <div className="break-words whitespace-pre-wrap">{data.message}</div>
        </div>
    );
};

export interface SelectPropertyOptionItemI {
    label: string;
    value: string;
}

export interface SelectPropertyOptionDataI {
    componentName: string;
    kind: 'select-property-option';
    options: SelectPropertyOptionItemI[];
    propertyName: string;
    truncated?: boolean;
}

/**
 * Renders the selectPropertyOption / selectTriggerPropertyOption tool result as a lightweight searchable
 * picker. The web client uses ComboBox which is not available in the SDK; instead this renders a plain
 * text filter input + clickable option buttons. On pick, the option's real value is submitted as a
 * system message so the agent writes the value into the workflow.
 */
const SelectPropertyOptionMessage = ({data}: DataMessagePartProps<SelectPropertyOptionDataI>) => {
    const [filterText, setFilterText] = useState('');
    const [picked, setPicked] = useState<SelectPropertyOptionItemI | undefined>();

    const threadRuntime = useThreadRuntime();

    const options = useMemo(() => data.options ?? [], [data.options]);

    const filteredOptions = useMemo(
        () =>
            options.filter((option: SelectPropertyOptionItemI) =>
                option.label.toLowerCase().includes(filterText.toLowerCase())
            ),
        [filterText, options]
    );

    if (picked) {
        return (
            <div className="mt-2 flex items-center gap-2 text-sm">
                <CheckIcon className="size-4 text-emerald-600" />

                <span>
                    Picked: <span className="font-medium">{picked.label}</span>
                </span>
            </div>
        );
    }

    if (options.length === 0) {
        return (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No options available for {data.propertyName}.
            </div>
        );
    }

    const handlePick = (option: SelectPropertyOptionItemI) => {
        setPicked(option);

        threadRuntime.append({
            content: [{text: `User picked: ${option.label} (value: ${option.value})`, type: 'text'}],
            role: 'system',
        });
    };

    return (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
            <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Search options…"
                type="text"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
            />

            <div className="flex flex-col items-start gap-2">
                {filteredOptions.map((option: SelectPropertyOptionItemI) => (
                    <button
                        key={option.value}
                        className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                        type="button"
                        onClick={() => handlePick(option)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {data.truncated && (
                <span className="text-xs text-muted-foreground">
                    Showing the first {options.length}. Narrow with a search term if you don&apos;t see yours.
                </span>
            )}
        </div>
    );
};

export interface CreateConnectionDataI {
    componentLabel?: string;
    componentName: string;
    kind: 'create-connection';
    suggestedName?: string;
}

/**
 * Mounts the embedded ConnectDialog for a resolved integration. Mirrors the Integrations page pattern: opens the
 * dialog on mount and watches the shared portal so the parent learns when the user closes it.
 */
function ConnectDialogOpener({
    baseUrl,
    environment,
    integrationId,
    jwtToken,
    onDone,
}: {
    baseUrl: string;
    environment: string;
    integrationId: string;
    jwtToken: string;
    onDone: () => void;
}) {
    const {closeDialog, openDialog} = useConnectDialog({baseUrl, environment, integrationId, jwtToken});

    useEffect(() => {
        openDialog();

        const portal = document.getElementById('connect-dialog-portal');

        const observer = new MutationObserver(() => {
            const currentPortal = document.getElementById('connect-dialog-portal');

            if (currentPortal && currentPortal.childNodes.length === 0) {
                onDone();
            }
        });

        if (portal) {
            observer.observe(portal, {childList: true});
        }

        return () => {
            observer.disconnect();
            closeDialog();
        };
        // openDialog/closeDialog are recreated each render; opening once on mount is intentional.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

/**
 * Renders the createConnection tool result as a "Connect <component>" button that opens the embedded ConnectDialog.
 * The tool reports componentName/componentLabel; the integrationId the dialog needs is resolved by matching the
 * component against the connected user's integrations.
 */
const CreateConnectionMessage = ({data}: DataMessagePartProps<CreateConnectionDataI>) => {
    const [integrationId, setIntegrationId] = useState<string | null>(null);
    const [opening, setOpening] = useState(false);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const config = useEmbeddedChatConfig();

    const label = data.componentLabel || data.componentName;

    const handleConnect = useCallback(async () => {
        if (!config) {
            return;
        }

        setOpening(true);
        setError(null);

        try {
            const response = await fetch(`${config.baseUrl}/api/embedded/v1/integrations`, {
                cache: 'no-cache',
                headers: {Authorization: `Bearer ${config.jwtToken}`, 'X-ENVIRONMENT': config.environment},
                method: 'GET',
            });

            const integrations = (await response.json()) as Array<{componentName: string; id: number}>;

            const integration = integrations.find(
                (curIntegration) => curIntegration.componentName === data.componentName
            );

            if (!integration) {
                setError(`No integration is available for ${label}.`);
                setOpening(false);

                return;
            }

            setIntegrationId(String(integration.id));
        } catch {
            setError(`Couldn't open the connect dialog for ${label}.`);
            setOpening(false);
        }
    }, [config, data.componentName, label]);

    if (connected) {
        return (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <CheckIcon className="size-4 text-emerald-600" />

                <span>
                    Connected <span className="font-medium">{label}</span>
                </span>
            </div>
        );
    }

    return (
        <div className="mt-2 flex flex-col items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <button
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={opening || !config}
                onClick={handleConnect}
                type="button"
            >
                <PlugIcon className="size-4" />

                {opening ? `Connecting ${label}…` : `Connect ${label}`}
            </button>

            {error && <span className="text-xs text-red-500">{error}</span>}

            {integrationId && config && (
                <ConnectDialogOpener
                    baseUrl={config.baseUrl}
                    environment={config.environment}
                    integrationId={integrationId}
                    jwtToken={config.jwtToken}
                    onDone={() => {
                        setIntegrationId(null);
                        setOpening(false);
                        setConnected(true);
                    }}
                />
            )}
        </div>
    );
};

export interface SelectConnectionDataI {
    componentLabel?: string;
    componentName: string;
    kind: 'select-connection';
}

interface ConnectionRowI {
    id: number;
    name: string;
}

/**
 * Renders the selectConnection tool result. The tool reports only componentName/componentLabel, so this fetches the
 * connected user's connections for the component (their IntegrationInstances). Per spec it only renders a picker when
 * there is more than one connection; a single connection is selected automatically without prompting.
 */
const SelectConnectionMessage = ({data}: DataMessagePartProps<SelectConnectionDataI>) => {
    const [connections, setConnections] = useState<ConnectionRowI[] | null>(null);
    const [filterText, setFilterText] = useState('');
    const [picked, setPicked] = useState<ConnectionRowI | null>(null);
    const [error, setError] = useState<string | null>(null);

    const submittedRef = useRef(false);

    const config = useEmbeddedChatConfig();
    const threadRuntime = useThreadRuntime();

    const label = data.componentLabel || data.componentName;

    const submitConnection = useCallback(
        (connection: ConnectionRowI) => {
            if (submittedRef.current) {
                return;
            }

            submittedRef.current = true;

            setPicked(connection);

            threadRuntime.append({
                content: [
                    {
                        text: `User selected connection: ${connection.name} (connectionId: ${connection.id})`,
                        type: 'text',
                    },
                ],
                role: 'system',
            });
        },
        [threadRuntime]
    );

    const filteredConnections = useMemo(
        () =>
            (connections ?? []).filter((connection) =>
                connection.name.toLowerCase().includes(filterText.toLowerCase())
            ),
        [connections, filterText]
    );

    useEffect(() => {
        if (!config) {
            return;
        }

        let cancelled = false;

        const loadConnections = async () => {
            try {
                const response = await fetch(
                    `${config.baseUrl}/api/embedded/v1/components/${data.componentName}/connections`,
                    {
                        cache: 'no-cache',
                        headers: {Authorization: `Bearer ${config.jwtToken}`, 'X-Environment': config.environment},
                        method: 'GET',
                    }
                );

                const rows = (await response.json()) as ConnectionRowI[];

                if (cancelled) {
                    return;
                }

                setConnections(rows);

                // Auto-use the only connection without prompting; the picker is for the multi-connection case.
                if (rows.length === 1) {
                    submitConnection(rows[0]);
                }
            } catch {
                if (!cancelled) {
                    setError(`Couldn't load connections for ${label}.`);
                    setConnections([]);
                }
            }
        };

        loadConnections();

        return () => {
            cancelled = true;
        };
        // Fetch once per component; submitConnection/label are stable enough for this one-shot load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, data.componentName]);

    if (picked) {
        return (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <CheckIcon className="size-4 text-emerald-600" />

                <span>
                    Using <span className="font-medium">{picked.name}</span>
                </span>
            </div>
        );
    }

    if (error) {
        return <span className="mt-2 block text-xs text-red-500">{error}</span>;
    }

    if (connections === null) {
        return <div className="mt-2 text-sm text-muted-foreground">Loading {label} connections…</div>;
    }

    if (connections.length === 0) {
        return (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No {label} connections available yet.
            </div>
        );
    }

    return (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
            <div className="text-sm">Select a {label} connection</div>

            <input
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="Search connections…"
                type="text"
                value={filterText}
            />

            <div className="flex flex-col items-start gap-2">
                {filteredConnections.map((connection) => (
                    <button
                        key={connection.id}
                        className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                        onClick={() => submitConnection(connection)}
                        type="button"
                    >
                        {connection.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const embeddedChatDataComponents = {
    'ask-user-question': (props: DataMessagePartProps<AskUserQuestionDataI>) => <AskUserQuestionMessage {...props} />,
    'create-connection': (props: DataMessagePartProps<CreateConnectionDataI>) => <CreateConnectionMessage {...props} />,
    'run-error': (props: DataMessagePartProps<RunErrorDataI>) => <RunErrorMessage {...props} />,
    'select-connection': (props: DataMessagePartProps<SelectConnectionDataI>) => <SelectConnectionMessage {...props} />,
    'select-property-option': (props: DataMessagePartProps<SelectPropertyOptionDataI>) => (
        <SelectPropertyOptionMessage {...props} />
    ),
};
