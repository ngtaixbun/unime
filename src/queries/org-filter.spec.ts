import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildTreatasFilter,
  encodeDimensionValue,
  isEncodedDimensionValue,
  toDaxScalar,
} from "./org-filter";

describe("org-filter", () => {
  it("preserves number and string ID types", () => {
    expect(
      encodeDimensionValue(12),
    ).toBe("number:12");

    expect(
      encodeDimensionValue("0012"),
    ).toBe("string:0012");
  });

  it("validates values returned by HTML select", () => {
    expect(
      isEncodedDimensionValue("all"),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "number:12",
      ),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "string:0012",
      ),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "number:",
      ),
    ).toBe(false);

    expect(
      isEncodedDimensionValue("0012"),
    ).toBe(false);
  });

  it("escapes DAX strings", () => {
    expect(
      toDaxScalar(
        'string:A"01',
      ),
    ).toBe('"A""01"');
  });

  it("omits all filters", () => {
    expect(
      buildTreatasFilter(
        "all",
        "'dimnv'[Region ID]",
      ),
    ).toBe("");
  });

  it("creates a selected TREATAS filter", () => {
    expect(
      buildTreatasFilter(
        "string:R01",
        "'dimnv'[Region ID]",
      ),
    ).toContain(
      `TREATAS(
            { "R01" },
            'dimnv'[Region ID]`,
    );
  });

  it("emits numeric IDs without DAX string quotes", () => {
    const filter =
      buildTreatasFilter(
        "number:16365",
        "'dimnv'[sup_id]",
      );

    expect(filter).toContain(
      "{ 16365 }",
    );
    expect(filter).not.toContain(
      '"16365"',
    );
  });
});
