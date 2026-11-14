import type { FieldMappingConfigType, MapObjectFieldsType, OptionType } from "@bytechef/embedded";

export interface FieldsRequestI {
  actionName: string;
  input: Record<string, unknown>;
}

export interface IntegrationFieldSourceI {
  componentName: string;
  componentVersion: number;
  fieldsRequest: (objectType: string) => FieldsRequestI;
  objectTypes: OptionType[];
  toFieldOptions: (result: unknown) => OptionType[];
}

interface SoqlResponseI {
  records?: { Label: string; QualifiedApiName: string }[];
}

const salesforceFieldSource: IntegrationFieldSourceI = {
  componentName: "salesforce",
  componentVersion: 1,
  fieldsRequest: (objectType) => ({
    actionName: "soqlQuery",
    input: {
      q: `SELECT QualifiedApiName, Label FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectType}'`,
    },
  }),
  objectTypes: [
    { label: "Lead", value: "Lead" },
    { label: "Contact", value: "Contact" },
  ],
  toFieldOptions: (result) =>
    ((result as SoqlResponseI).records ?? []).map((record) => ({
      label: record.Label,
      value: record.QualifiedApiName,
    })),
};

export const INTEGRATION_FIELD_SOURCES: Record<string, IntegrationFieldSourceI> = {
  salesforce: salesforceFieldSource,
};

export function buildMapObjectFields(
  objectName: string,
  fieldSource: IntegrationFieldSourceI,
  applicationFields: FieldMappingConfigType["applicationFields"]
): MapObjectFieldsType {
  return {
    [objectName]: {
      applicationFields,
      integrationFields: {
        get: async ({ executeAction, objectType }) => {
          if (!fieldSource.objectTypes.some((option) => option.value === objectType)) {
            return [];
          }

          const { actionName, input } = fieldSource.fieldsRequest(objectType);

          const result = await executeAction(
            fieldSource.componentName,
            fieldSource.componentVersion,
            actionName,
            input
          );

          return fieldSource
            .toFieldOptions(result)
            .sort((first, second) => first.label.localeCompare(second.label));
        },
      },
      objectTypes: {
        get: async () => fieldSource.objectTypes,
      },
    },
  };
}
