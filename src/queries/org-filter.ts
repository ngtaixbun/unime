export const ALL_ORG_FILTER_VALUE =
  "all" as const;

export type EncodedDimensionValue =
  | typeof ALL_ORG_FILTER_VALUE
  | `number:${string}`
  | `string:${string}`;

export interface OrgQueryFilters {
  region?: EncodedDimensionValue;
  amm?: EncodedDimensionValue;
  supervisor?: EncodedDimensionValue;
}

export const EMPTY_ORG_QUERY_FILTERS:
  OrgQueryFilters = {};

export function isEncodedDimensionValue(
  value: string,
): value is EncodedDimensionValue {
  if (value === ALL_ORG_FILTER_VALUE) {
    return true;
  }

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

export function encodeDimensionValue(
  value: string | number,
): EncodedDimensionValue {
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
  if (value === ALL_ORG_FILTER_VALUE) {
    throw new Error(
      "Không thể chuyển giá trị all thành DAX scalar.",
    );
  }

  if (value.startsWith("number:")) {
    const numberText =
      value.slice("number:".length);

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

  if (value.startsWith("string:")) {
    const text =
      value.slice("string:".length);

    return `"${escapeDaxString(text)}"`;
  }

  throw new Error(
    "Dimension filter không hợp lệ.",
  );
}

export function buildTreatasFilter(
  value:
    | EncodedDimensionValue
    | undefined,
  targetColumn: string,
): string {
  if (
    value === undefined ||
    value === ALL_ORG_FILTER_VALUE
  ) {
    return "";
  }

  return [
    ",",
    "    KEEPFILTERS(",
    "        TREATAS(",
    `            { ${toDaxScalar(value)} },`,
    `            ${targetColumn}`,
    "        )",
    "    )",
  ].join("\n");
}
