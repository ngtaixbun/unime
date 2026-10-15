export const ALL_ORG_FILTER_VALUE =
  "all" as const;

export const BLANK_REGION_FILTER_VALUE =
  "blank:region" as const;

export type ScalarEncodedDimensionValue =
  | `number:${string}`
  | `string:${string}`;

export type BlankRegionEncodedDimensionValue =
  typeof BLANK_REGION_FILTER_VALUE;

export type SelectableEncodedDimensionValue =
  | ScalarEncodedDimensionValue
  | BlankRegionEncodedDimensionValue;

export type MultiEncodedDimensionValue =
  `multi:${string}`;

export type EncodedDimensionValue =
  | typeof ALL_ORG_FILTER_VALUE
  | SelectableEncodedDimensionValue
  | MultiEncodedDimensionValue;

export interface OrgQueryFilters {
  role?: EncodedDimensionValue;
  region?: EncodedDimensionValue;
  amm?: EncodedDimensionValue;
  supervisor?: EncodedDimensionValue;
  employee?: EncodedDimensionValue;
  npp?: EncodedDimensionValue;
  countFail?: EncodedDimensionValue;
}

export const EMPTY_ORG_QUERY_FILTERS:
  OrgQueryFilters = {};

function isScalarEncodedDimensionValue(
  value: string,
): value is ScalarEncodedDimensionValue {
  if (value.startsWith("string:")) {
    return true;
  }

  if (!value.startsWith("number:")) {
    return false;
  }

  const numberText =
    value.slice("number:".length);

  return (
    numberText.trim() !== "" &&
    Number.isFinite(
      Number(numberText),
    )
  );
}

function isSelectableEncodedDimensionValue(
  value: string,
): value is SelectableEncodedDimensionValue {
  return (
    value === BLANK_REGION_FILTER_VALUE ||
    isScalarEncodedDimensionValue(value)
  );
}

export function decodeDimensionValues(
  value:
    | EncodedDimensionValue
    | undefined,
): SelectableEncodedDimensionValue[] {
  if (
    value === undefined ||
    value === ALL_ORG_FILTER_VALUE
  ) {
    return [];
  }

  if (
    isSelectableEncodedDimensionValue(
      value,
    )
  ) {
    return [value];
  }

  if (!value.startsWith("multi:")) {
    return [];
  }

  const payload =
    value.slice("multi:".length);

  if (payload.trim() === "") {
    return [];
  }

  const decoded =
    payload
      .split(",")
      .map((item) => {
        try {
          return decodeURIComponent(item);
        }
        catch {
          return "";
        }
      })
      .filter(
        isSelectableEncodedDimensionValue,
      );

  return [...new Set(decoded)];
}

export function encodeDimensionValues(
  values:
    readonly EncodedDimensionValue[],
): EncodedDimensionValue {
  const normalized =
    values.flatMap(
      decodeDimensionValues,
    );
  const unique =
    [...new Set(normalized)];

  if (unique.length === 0) {
    return ALL_ORG_FILTER_VALUE;
  }

  if (unique.length === 1) {
    return unique[0];
  }

  return `multi:${
    unique
      .map(encodeURIComponent)
      .join(",")
  }`;
}

export function isEncodedDimensionValue(
  value: string,
): value is EncodedDimensionValue {
  if (value === ALL_ORG_FILTER_VALUE) {
    return true;
  }

  if (
    isSelectableEncodedDimensionValue(
      value,
    )
  ) {
    return true;
  }

  if (!value.startsWith("multi:")) {
    return false;
  }

  const decoded =
    decodeDimensionValues(
      value as MultiEncodedDimensionValue,
    );

  return decoded.length >= 2;
}

export function isMultiDimensionValue(
  value:
    | EncodedDimensionValue
    | undefined,
): value is MultiEncodedDimensionValue {
  return (
    typeof value === "string" &&
    value.startsWith("multi:") &&
    decodeDimensionValues(value).length >= 2
  );
}

export function dimensionValueIncludes(
  filter:
    | EncodedDimensionValue
    | undefined,
  candidate:
    EncodedDimensionValue,
): boolean {
  if (
    filter === undefined ||
    filter === ALL_ORG_FILTER_VALUE
  ) {
    return true;
  }

  if (
    candidate === ALL_ORG_FILTER_VALUE
  ) {
    return false;
  }

  return decodeDimensionValues(
    filter,
  ).includes(
    candidate as SelectableEncodedDimensionValue,
  );
}

export function encodeDimensionValue(
  value: string | number,
): ScalarEncodedDimensionValue {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "Dimension ID dạng số không hợp lệ.",
      );
    }

    return `number:${value}`;
  }

  return `string:${value}`;
}

function escapeDaxString(
  value: string,
): string {
  return value.replaceAll(
    '"',
    '""',
  );
}

export function toDaxScalar(
  value: EncodedDimensionValue,
): string {
  const values =
    decodeDimensionValues(value);

  if (values.length !== 1) {
    throw new Error(
      "Giá trị dimension phải chứa đúng một scalar.",
    );
  }

  const scalar = values[0];

  if (
    scalar === BLANK_REGION_FILTER_VALUE
  ) {
    throw new Error(
      "Blank Region không phải là DAX scalar.",
    );
  }

  if (scalar.startsWith("number:")) {
    const numberText =
      scalar.slice("number:".length);

    if (
      numberText.trim() === "" ||
      !Number.isFinite(
        Number(numberText),
      )
    ) {
      throw new Error(
        "Dimension ID dạng số không hợp lệ.",
      );
    }

    return numberText;
  }

  const text =
    scalar.slice("string:".length);

  return `"${escapeDaxString(text)}"`;
}

export function buildTreatasFilter(
  value:
    | EncodedDimensionValue
    | undefined,
  targetColumn: string,
): string {
  const values =
    decodeDimensionValues(value);

  if (values.length === 0) {
    return "";
  }

  if (
    values.includes(
      BLANK_REGION_FILTER_VALUE,
    )
  ) {
    throw new Error(
      "Blank Region chỉ được áp dụng qua buildRegionFilter.",
    );
  }

  const daxValues =
    values
      .map(
        (item) =>
          toDaxScalar(item),
      )
      .join(", ");

  return [
    ",",
    "    KEEPFILTERS(",
    "        TREATAS(",
    `            { ${daxValues} },`,
    `            ${targetColumn}`,
    "        )",
    "    )",
  ].join("\n");
}

export function buildRegionFilter(
  value:
    | EncodedDimensionValue
    | undefined,
): string {
  const values =
    decodeDimensionValues(value);

  if (values.length === 0) {
    return "";
  }

  const hasBlankRegion =
    values.includes(
      BLANK_REGION_FILTER_VALUE,
    );
  const regionIds =
    values.filter(
      isScalarEncodedDimensionValue,
    );

  if (!hasBlankRegion) {
    return buildTreatasFilter(
      value,
      "'dimnv'[Region ID]",
    );
  }

  const normalRegionPredicate =
    regionIds.length === 0
      ? []
      : [
          "                || CONTAINSROW(",
          `                    { ${
            regionIds
              .map((item) =>
                toDaxScalar(item),
              )
              .join(", ")
          } },`,
          "                    'dimnv'[Region ID]",
          "                )",
        ];

  return [
    ",",
    "    KEEPFILTERS(",
    "        FILTER(",
    "            ALL('dimnv'[Region ID], 'dimnv'[Region]),",
    "            ISBLANK('dimnv'[Region ID])",
    "                || ISBLANK('dimnv'[Region])",
    "                || LEN(TRIM('dimnv'[Region])) = 0",
    ...normalRegionPredicate,
    "        )",
    "    )",
  ].join("\n");
}
