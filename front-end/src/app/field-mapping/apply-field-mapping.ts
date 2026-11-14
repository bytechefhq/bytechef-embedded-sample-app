export type FieldMappingDirectionType = "TO_APPLICATION" | "TO_INTEGRATION";

export interface FieldMappingPairI {
  applicationField: string;
  integrationField: string;
}

type JsonObjectType = Record<string, unknown>;

export function parseFieldMapping(value: unknown): FieldMappingPairI[] {
  if (!isJsonObject(value)) {
    throw new Error("Expected a field mapping object");
  }

  const rawMappings = value.mappings === undefined || value.mappings === null ? [] : value.mappings;

  if (!Array.isArray(rawMappings)) {
    throw new Error("Field mapping mappings must be an array");
  }

  if (rawMappings.length === 0) {
    throw new Error("Field mapping has no mappings");
  }

  return rawMappings.map((rawMapping) => {
    if (!isJsonObject(rawMapping)) {
      throw new Error(`Each field mapping entry must be an object, got: ${JSON.stringify(rawMapping)}`);
    }

    const applicationField = rawMapping.applicationField;

    if (!isJsonObject(applicationField) || typeof applicationField.value !== "string") {
      throw new Error(`Each field mapping entry needs an applicationField.value, got: ${JSON.stringify(rawMapping)}`);
    }

    if (typeof rawMapping.integrationField !== "string") {
      throw new Error(`Each field mapping entry needs an integrationField, got: ${JSON.stringify(rawMapping)}`);
    }

    return {applicationField: applicationField.value, integrationField: rawMapping.integrationField};
  });
}

export function applyFieldMapping(
  mappings: FieldMappingPairI[],
  data: unknown,
  direction: FieldMappingDirectionType,
  includeUnmapped: boolean
): unknown {
  if (isJsonObject(data)) {
    return applyToObject(mappings, data, direction, includeUnmapped);
  }

  if (Array.isArray(data)) {
    return data.map((item) => applyFieldMapping(mappings, item, direction, includeUnmapped));
  }

  throw new Error(
    `Field mapping data must be an object or an array of objects, got: ${data === null ? "null" : typeof data}`
  );
}

function applyToObject(
  mappings: FieldMappingPairI[],
  source: JsonObjectType,
  direction: FieldMappingDirectionType,
  includeUnmapped: boolean
): JsonObjectType {
  const result = includeUnmapped ? deepCopy(source) : {};

  if (includeUnmapped) {
    for (const mapping of mappings) {
      removeValue(result, splitPath(sourcePath(mapping, direction)), 0);
    }
  }

  const presentMappings = mappings
    .filter((mapping) => containsPath(source, sourcePath(mapping, direction)))
    .sort(
      (first, second) =>
        splitPath(destinationPath(first, direction)).length - splitPath(destinationPath(second, direction)).length
    );

  for (const mapping of presentMappings) {
    setValue(result, destinationPath(mapping, direction), getValue(source, sourcePath(mapping, direction)));
  }

  return result;
}

function sourcePath(mapping: FieldMappingPairI, direction: FieldMappingDirectionType): string {
  return direction === "TO_INTEGRATION" ? mapping.applicationField : mapping.integrationField;
}

function destinationPath(mapping: FieldMappingPairI, direction: FieldMappingDirectionType): string {
  return direction === "TO_INTEGRATION" ? mapping.integrationField : mapping.applicationField;
}

function splitPath(path: string): string[] {
  const segments = path.split(".");

  while (segments.length > 1 && segments[segments.length - 1] === "") {
    segments.pop();
  }

  return segments;
}

function containsPath(object: JsonObjectType, path: string): boolean {
  const segments = splitPath(path);
  let current = object;

  for (let index = 0; index < segments.length; index++) {
    if (!Object.hasOwn(current, segments[index])) {
      return false;
    }

    if (index === segments.length - 1) {
      return true;
    }

    const nested = current[segments[index]];

    if (!isJsonObject(nested)) {
      return false;
    }

    current = nested;
  }

  return false;
}

function getValue(object: JsonObjectType, path: string): unknown {
  const segments = splitPath(path);
  let current = object;

  for (let index = 0; index < segments.length - 1; index++) {
    const nested = current[segments[index]];

    if (!isJsonObject(nested)) {
      return null;
    }

    current = nested;
  }

  return current[segments[segments.length - 1]];
}

function setValue(object: JsonObjectType, path: string, value: unknown): void {
  const segments = splitPath(path);
  let current = object;

  for (let index = 0; index < segments.length - 1; index++) {
    const existing = current[segments[index]];
    const next: JsonObjectType = isJsonObject(existing) ? {...existing} : {};

    current[segments[index]] = next;

    current = next;
  }

  const lastSegment = segments[segments.length - 1];
  const existingValue = current[lastSegment];

  if (isJsonObject(existingValue) && isJsonObject(value)) {
    current[lastSegment] = mergeObjects(existingValue, value);
  } else {
    current[lastSegment] = value;
  }
}

function removeValue(object: JsonObjectType, segments: string[], index: number): void {
  const segment = segments[index];

  if (index === segments.length - 1) {
    delete object[segment];

    return;
  }

  const nested = object[segment];

  if (!isJsonObject(nested)) {
    return;
  }

  removeValue(nested, segments, index + 1);

  if (Object.keys(nested).length === 0) {
    delete object[segment];
  }
}

function mergeObjects(baseObject: JsonObjectType, overlayObject: JsonObjectType): JsonObjectType {
  const mergedObject: JsonObjectType = {...baseObject};

  for (const [key, overlayValue] of Object.entries(overlayObject)) {
    const baseValue = mergedObject[key];

    mergedObject[key] =
      isJsonObject(baseValue) && isJsonObject(overlayValue) ? mergeObjects(baseValue, overlayValue) : overlayValue;
  }

  return mergedObject;
}

function deepCopy(object: JsonObjectType): JsonObjectType {
  const copy: JsonObjectType = {};

  for (const [key, value] of Object.entries(object)) {
    copy[key] = isJsonObject(value) ? deepCopy(value) : value;
  }

  return copy;
}

function isJsonObject(value: unknown): value is JsonObjectType {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
