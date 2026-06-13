// The custom builder's own catalog of components, operations, and fields.
// This is intentionally hardcoded and minimal — the demo's point is that the
// embedding app owns its UX; ByteChef only needs the resulting definition.

export type ComponentName = 'googleMail' | 'slack';

// How a field is captured in the UI and serialized into the definition parameters.
export type FieldKind =
  | 'string'        // a plain text input -> string value
  | 'stringArray'   // comma-separated text input -> string[] value
  | 'hidden';       // not shown; emitted as a fixed default (e.g. bodyType=TEXT)

export interface CatalogField {
  key: string;          // the parameter key in the workflow definition
  label: string;        // UI label
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string; // for 'hidden' fields, the constant value to emit
}

export interface CatalogOperation {
  name: string;         // operation name, e.g. "sendEmail"
  label: string;        // UI label, e.g. "Send Email"
  fields: CatalogField[];
}

export interface CatalogComponent {
  name: ComponentName;
  label: string;
  triggers: CatalogOperation[];
  actions: CatalogOperation[];
}

export const COMPONENTS: CatalogComponent[] = [
  {
    name: 'googleMail',
    label: 'Gmail',
    triggers: [
      {name: 'newEmail', label: 'New Email', fields: []}
    ],
    actions: [
      {
        name: 'sendEmail',
        label: 'Send Email',
        fields: [
          {key: 'to', label: 'To (comma-separated)', kind: 'stringArray', required: true, placeholder: 'alice@example.com, bob@example.com'},
          {key: 'subject', label: 'Subject', kind: 'string', required: true, placeholder: 'Hello'},
          {key: 'bodyType', label: '', kind: 'hidden', defaultValue: 'TEXT'},
          {key: 'body', label: 'Body', kind: 'string', required: true, placeholder: 'Message body'}
        ]
      },
      {
        name: 'getEmail',
        label: 'Get Email',
        fields: [
          {key: 'id', label: 'Message ID', kind: 'string', required: true, placeholder: '18ab...'}
        ]
      },
      {
        name: 'searchEmail',
        label: 'Search Email',
        fields: [
          {key: 'from', label: 'From', kind: 'string', required: false, placeholder: 'sender@example.com'},
          {key: 'subject', label: 'Subject contains', kind: 'string', required: false, placeholder: 'invoice'}
        ]
      }
    ]
  },
  {
    name: 'slack',
    label: 'Slack',
    triggers: [
      {name: 'anyEvent', label: 'Any Event', fields: []}
    ],
    actions: [
      {
        name: 'sendChannelMessage',
        label: 'Send Channel Message',
        fields: [
          {key: 'channel', label: 'Channel ID', kind: 'string', required: true, placeholder: 'C0123456789'},
          {key: 'text', label: 'Message', kind: 'string', required: true, placeholder: 'Hello, team!'}
        ]
      },
      {
        name: 'sendDirectMessage',
        label: 'Send Direct Message',
        fields: [
          {key: 'channel', label: 'User ID', kind: 'string', required: true, placeholder: 'U0123456789'},
          {key: 'text', label: 'Message', kind: 'string', required: true, placeholder: 'Hi there!'}
        ]
      },
      {
        name: 'addReaction',
        label: 'Add Reaction',
        fields: [
          {key: 'channel', label: 'Channel ID', kind: 'string', required: true, placeholder: 'C0123456789'},
          {key: 'timestamp', label: 'Message Timestamp', kind: 'string', required: true, placeholder: '1234567890.123456'},
          {key: 'name', label: 'Emoji Name', kind: 'string', required: true, placeholder: 'thumbsup'}
        ]
      }
    ]
  }
];

// String comparison operations supported by the condition/v1 task dispatcher.
export const CONDITION_OPERATIONS: {value: string; label: string}[] = [
  {value: 'EQUALS', label: 'equals'},
  {value: 'NOT_EQUALS', label: 'does not equal'},
  {value: 'CONTAINS', label: 'contains'},
  {value: 'EMPTY', label: 'is empty'},
  {value: 'NOT_EMPTY', label: 'is not empty'}
];

// Lookup helpers.
export function findComponent(name: ComponentName): CatalogComponent {
  const component = COMPONENTS.find((candidate) => candidate.name === name);

  if (!component) {
    throw new Error(`Unknown component: ${name}`);
  }

  return component;
}

export function findOperation(
  component: CatalogComponent,
  operationName: string,
  group: 'triggers' | 'actions'
): CatalogOperation | undefined {
  return component[group].find((operation) => operation.name === operationName);
}
