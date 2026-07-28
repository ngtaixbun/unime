import { describe, expect, it } from "vitest";

import { kpiMtd, kpiMtdQuery } from "./kpimtd";

describe("kpiMtd", () => {
  it("uses the unimeModel connection and the kpimtd DAX file", () => {
    const result = kpiMtd();

    expect(result.connection).toBe("unimeModel");
    expect(result.query).toBe(kpiMtdQuery);
  });

  it("scales all five KPI ratios in DAX", () => {
    const { query } = kpiMtd();

    expect(query).toMatch(
      /"successfulCallsMtd",\s*\[mtd_call\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"visitMtd",\s*\[mtd_visit\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"timeSpendMtd",\s*\[mtd_timespend\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"osaMtd",\s*\[mtd_osa\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"qcMtd",\s*\[mtd_qc\]\s*\*\s*100/,
    );
  });

  it("keeps all five Issued measures unscaled", () => {
    const { query } = kpiMtd();

    expect(query).toMatch(
      /"successfulCallsIssued",\s*\[nvfail_call\],/,
    );
    expect(query).toMatch(
      /"visitIssued",\s*\[nvfail_visit\],/,
    );
    expect(query).toMatch(
      /"timeSpendIssued",\s*\[nvfail_timespend\],/,
    );
    expect(query).toMatch(
      /"osaIssued",\s*\[nvfail_osa\],/,
    );
    expect(query).toMatch(
      /"qcIssued",\s*\[nvfail_qc\]/,
    );
  });

  it("maps all ten exact query columns to cleaned field names", () => {
    const { columnMetadata } =
      kpiMtd();

    expect(
      Object.fromEntries(
        Object.entries(columnMetadata).map(
          ([queryColumn, metadata]) => [
            queryColumn,
            metadata.name,
          ],
        ),
      ),
    ).toEqual({
      "[successfulCallsMtd]":
        "successfulCallsMtd",
      "[successfulCallsIssued]":
        "successfulCallsIssued",
      "[visitMtd]": "visitMtd",
      "[visitIssued]": "visitIssued",
      "[timeSpendMtd]": "timeSpendMtd",
      "[timeSpendIssued]":
        "timeSpendIssued",
      "[osaMtd]": "osaMtd",
      "[osaIssued]": "osaIssued",
      "[qcMtd]": "qcMtd",
      "[qcIssued]": "qcIssued",
    });
  });
});
