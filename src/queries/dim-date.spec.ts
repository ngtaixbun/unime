import {
  describe,
  expect,
  it,
} from "vitest";

import {
  dimDate,
  dimDateColumnMetadata,
  dimDateQuery,
} from "./dim-date";

const expectedColumnNames = {
  "[cycleKey]": "cycleKey",
  "[cycleLabel]": "cycleLabel",
  "[cycleStartDate]": "cycleStartDate",
  "[cycleEndDate]": "cycleEndDate",
  "[cycleSort]": "cycleSort",
  "[isLatestCycle]": "isLatestCycle",
};

describe("dimDate", () => {
  it("uses the unimeModel connection and the dimdate DAX file", () => {
    const result = dimDate();

    expect(result.connection).toBe("unimeModel");
    expect(result.query).toBe(dimDateQuery);
    expect(result.query).not.toBe("");
  });

  it("maps the exact six SDK columns to their cleaned field names", () => {
    expect(
      Object.fromEntries(
        Object.entries(
          dimDateColumnMetadata,
        ).map(
          ([queryColumn, metadata]) => [
            queryColumn,
            metadata.name,
          ],
        ),
      ),
    ).toEqual(expectedColumnNames);

    expect(
      Object.keys(dimDate().columnMetadata),
    ).toEqual(Object.keys(expectedColumnNames));
  });

  it("projects all six cycle contract aliases from DAX", () => {
    const projection =
      dimDateQuery.slice(
        dimDateQuery.indexOf(
          "EVALUATE\nSELECTCOLUMNS",
        ),
      );

    for (
      const alias of
      Object.values(expectedColumnNames)
    ) {
      expect(projection).toMatch(
        new RegExp(
          `"${alias}",\\s*`,
        ),
      );
    }

    expect(projection).toMatch(
      /ORDER BY\s+\[cycleSort\]\s+ASC/,
    );
  });
});
