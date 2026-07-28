# Unime Backend KPI Trend Source Review

> Generated from current runtime source before migrating KPI trend to backend.

Project root:

```text
/Users/nguyenngoctai/Unime
```

---

## File: `./src/queries/kpimtd-trend.dax`

``dax
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _CycleDates =
        CALCULATETABLE(
            VALUES('Date'[Date]),

            KEEPFILTERS(
                TREATAS(
                    { _SelectedCycleKey },
                    'Date'[Chu kỳ KPI Key]
                )
            )
        )

    VAR _TrendRows =
        CALCULATETABLE(
            ADDCOLUMNS(
                _CycleDates,

                "successfulCallsMtd",
                    CALCULATE([mtd_call] * 100),

                "visitMtd",
                    CALCULATE([mtd_visit] * 100),

                "timeSpendMtd",
                    CALCULATE([mtd_timespend] * 100),

                "osaMtd",
                    CALCULATE([mtd_osa] * 100),

                "qcMtd",
                    CALCULATE([mtd_qc] * 100),

                "benchmark",
                    90.0
            ),

            KEEPFILTERS(
                TREATAS(
                    { _SelectedCycleKey },
                    'Date'[Chu kỳ KPI Key]
                )
            )
            __REGION_FILTER__
            __AMM_FILTER__
            __SUPERVISOR_FILTER__
        )

    VAR _ValidTrendRows =
        FILTER(
            _TrendRows,

            NOT ISBLANK([successfulCallsMtd])
                || NOT ISBLANK([visitMtd])
                || NOT ISBLANK([timeSpendMtd])
                || NOT ISBLANK([osaMtd])
                || NOT ISBLANK([qcMtd])
        )

EVALUATE
SELECTCOLUMNS(
    _ValidTrendRows,

    "Date",
        'Date'[Date],

    "successfulCallsMtd",
        [successfulCallsMtd],

    "visitMtd",
        [visitMtd],

    "timeSpendMtd",
        [timeSpendMtd],

    "osaMtd",
        [osaMtd],

    "qcMtd",
        [qcMtd],

    "benchmark",
        [benchmark]
)

ORDER BY
    [Date] ASC
``

---

## File: `./src/queries/kpimtd-trend.ts`

``typescript
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import type { DimDateCycleValue } from "./dim-date";
import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";
import kpiMtdTrendDax from "./kpimtd-trend.dax?raw";

const connection = "unimeModel";

export type KpiMtdTrendRow = {
  Date: string;
  successfulCallsMtd: number | null;
  visitMtd: number | null;
  timeSpendMtd: number | null;
  osaMtd: number | null;
  qcMtd: number | null;
  benchmark: number;
};

export interface KpiMtdTrendQueryParams {
  cycleKey: DimDateCycleValue;
  filters?: OrgQueryFilters;
}

export const kpiMtdTrendQuery =
  kpiMtdTrendDax.trim();

export const kpiMtdTrendColumnMetadata:
  ColumnMetadataMap = {
    "[Date]": {
      name: "Date",
      displayName: "Ngày",
    },
    "[successfulCallsMtd]": {
      name: "successfulCallsMtd",
      displayName: "Successful Calls MTD",
    },
    "[visitMtd]": {
      name: "visitMtd",
      displayName: "Tần suất viếng thăm MTD",
    },
    "[timeSpendMtd]": {
      name: "timeSpendMtd",
      displayName: "Time Spend MTD",
    },
    "[osaMtd]": {
      name: "osaMtd",
      displayName: "OSA MTD",
    },
    "[qcMtd]": {
      name: "qcMtd",
      displayName: "QC MTD",
    },
    "[benchmark]": {
      name: "benchmark",
      displayName: "Benchmark",
    },
  };

function toDaxScalar(
  value: DimDateCycleValue,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "cycleKey KPI trend không hợp lệ.",
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      "cycleKey KPI trend đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function kpiMtdTrend({
  cycleKey,
  filters = {},
}: KpiMtdTrendQueryParams) {
  for (const placeholder of [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ]) {
    if (
      !kpiMtdTrendQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template kpiMtdTrend thiếu ${placeholder}.`,
      );
    }
  }

  const query = kpiMtdTrendQuery
    .replace(
      "__SELECTED_CYCLE_KEY__",
      toDaxScalar(cycleKey),
    )
    .replace(
      "__REGION_FILTER__",
      buildTreatasFilter(
        filters.region,
        "'dimnv'[Region ID]",
      ),
    )
    .replace(
      "__AMM_FILTER__",
      buildTreatasFilter(
        filters.amm,
        "'dimnv'[amm_id]",
      ),
    )
    .replace(
      "__SUPERVISOR_FILTER__",
      buildTreatasFilter(
        filters.supervisor,
        "'dimnv'[sup_id]",
      ),
    );

  if (
    query.includes("__SELECTED_") ||
    query.includes("__REGION_FILTER__") ||
    query.includes("__AMM_FILTER__") ||
    query.includes(
      "__SUPERVISOR_FILTER__",
    )
  ) {
    throw new Error(
      "Không thể áp dụng filter vào kpiMtdTrend.",
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      kpiMtdTrendColumnMetadata,
  };
}
``

---

## File: `./src/queries/kpimtd-trend.spec.ts`

``typescript
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  kpiMtdTrend,
  kpiMtdTrendColumnMetadata,
  kpiMtdTrendQuery,
} from "./kpimtd-trend";

describe("kpiMtdTrend", () => {
  it("uses an independent query and injects cycleKey", () => {
    const result =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(result.connection).toBe(
      "unimeModel",
    );
    expect(result.query).not.toBe(
      kpiMtdTrendQuery,
    );
    expect(result.query).toContain(
      "202608",
    );
    expect(result.query).toMatch(
      /TREATAS\(\s*\{\s*_SelectedCycleKey\s*\},\s*'Date'\[Chu kỳ KPI Key\]/,
    );
    expect(result.query).not.toContain(
      "__SELECTED_CYCLE_KEY__",
    );
  });

  it("omits organization filters when every value is all", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          region: "all",
          amm: "all",
          supervisor: "all",
        },
      });

    expect(query).not.toContain(
      "'dimnv'[Region ID]",
    );
    expect(query).not.toContain(
      "'dimnv'[amm_id]",
    );
    expect(query).not.toContain(
      "'dimnv'[sup_id]",
    );
    expect(query).toContain(
      "'Date'[Chu kỳ KPI Key]",
    );
  });

  it("applies all organization filters to the daily measure context", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          region: "number:1",
          amm: "string:001",
          supervisor: "string:S01",
        },
      });

    const trendRowsIndex =
      query.indexOf(
        "VAR _TrendRows",
      );

    expect(trendRowsIndex).toBeGreaterThan(
      -1,
    );

    for (const targetColumn of [
      "'dimnv'[Region ID]",
      "'dimnv'[amm_id]",
      "'dimnv'[sup_id]",
    ]) {
      expect(
        query.indexOf(targetColumn),
      ).toBeGreaterThan(
        trendRowsIndex,
      );
    }

    expect(query).not.toContain(
      "__REGION_FILTER__",
    );
    expect(query).not.toContain(
      "__AMM_FILTER__",
    );
    expect(query).not.toContain(
      "__SUPERVISOR_FILTER__",
    );
  });

  it("keeps numeric Supervisor IDs unquoted and leaves no placeholders", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          supervisor:
            "number:16365",
        },
      });

    expect(query).toMatch(
      /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
    );
    expect(query).not.toMatch(
      /TREATAS\(\s*\{\s*"16365"\s*\},\s*'dimnv'\[sup_id\]/,
    );

    for (const placeholder of [
      "__SELECTED_CYCLE_KEY__",
      "__REGION_FILTER__",
      "__AMM_FILTER__",
      "__SUPERVISOR_FILTER__",
    ]) {
      expect(query).not.toContain(
        placeholder,
      );
    }
  });

  it("changes the generated query when cycle changes", () => {
    const previous =
      kpiMtdTrend({
        cycleKey: 202607,
      }).query;
    const current =
      kpiMtdTrend({
        cycleKey: 202608,
      }).query;

    expect(current).not.toBe(previous);
    expect(current).toContain(
      "202608",
    );
    expect(current).not.toContain(
      "202607",
    );
  });

  it("returns daily KPI points without Issued fields", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(query).toContain(
      "VALUES('Date'[Date])",
    );
    expect(query).toContain(
      "'Date'[Chu kỳ KPI Key]",
    );

    for (const measure of [
      "mtd_call",
      "mtd_visit",
      "mtd_timespend",
      "mtd_osa",
      "mtd_qc",
    ]) {
      expect(query).toMatch(
        new RegExp(
          `\\[${measure}\\]\\s*\\*\\s*100`,
        ),
      );
    }

    expect(query).not.toContain(
      "nvfail_",
    );
  });

  it("uses benchmark 90 for all five series", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(query).toMatch(
      /"benchmark",\s*90(?:\.0)?/,
    );
  });

  it("maps the exact trend output columns", () => {
    expect(
      Object.fromEntries(
        Object.entries(
          kpiMtdTrendColumnMetadata,
        ).map(
          ([
            queryColumn,
            metadata,
          ]) => [
            queryColumn,
            metadata.name,
          ],
        ),
      ),
    ).toEqual({
      "[Date]": "Date",
      "[successfulCallsMtd]":
        "successfulCallsMtd",
      "[visitMtd]": "visitMtd",
      "[timeSpendMtd]":
        "timeSpendMtd",
      "[osaMtd]": "osaMtd",
      "[qcMtd]": "qcMtd",
      "[benchmark]": "benchmark",
    });
  });
});
``

---

## File: `./src/feature/overview/hooks/useKpiMtdTrendData.ts`

``typescript
import {
  useMemo,
} from "react";

import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  toDataTable,
} from "@/lib/to-data-table";
import type {
  DimDateCycleValue,
} from "@/queries/dim-date";
import {
  kpiMtdTrend,
  type KpiMtdTrendRow,
} from "@/queries/kpimtd-trend";

import type {
  OverviewFilters,
} from "../types";

export interface UseKpiMtdTrendDataResult {
  rows: KpiMtdTrendRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_FILTERS: OverviewFilters = {
  region: "all",
  amm: "all",
  supervisor: "all",
};

const KPI_MTD_TREND_INVALID_ERROR =
  "Semantic Model trả dữ liệu xu hướng KPI MTD không hợp lệ";

const REQUIRED_QUERY_COLUMNS = [
  "[Date]",
  "[successfulCallsMtd]",
  "[visitMtd]",
  "[timeSpendMtd]",
  "[osaMtd]",
  "[qcMtd]",
  "[benchmark]",
] as const;

function toFiniteNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toNullableFiniteNumber(
  value: unknown,
): {
  valid: boolean;
  value: number | null;
} {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  const parsed =
    toFiniteNumber(value);

  return {
    valid: parsed !== null,
    value: parsed,
  };
}

function toDateKey(
  value: unknown,
): string | null {
  if (value instanceof Date) {
    if (
      !Number.isFinite(
        value.getTime(),
      )
    ) {
      return null;
    }

    return [
      String(
        value.getFullYear(),
      ).padStart(4, "0"),
      String(
        value.getMonth() + 1,
      ).padStart(2, "0"),
      String(
        value.getDate(),
      ).padStart(2, "0"),
    ].join("-");
  }

  if (typeof value !== "string") {
    return null;
  }

  const isoMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/,
  );

  if (isoMatch) {
    return [
      isoMatch[1],
      isoMatch[2],
      isoMatch[3],
    ].join("-");
  }

  const serializedMatch = value.match(
    /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/,
  );

  if (!serializedMatch) {
    return null;
  }

  const parsedDate = new Date(
    Number(serializedMatch[1]),
  );

  if (
    !Number.isFinite(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return [
    String(
      parsedDate.getFullYear(),
    ).padStart(4, "0"),
    String(
      parsedDate.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      parsedDate.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export function useKpiMtdTrendData(
  cycleKey: DimDateCycleValue | null,
  filters: OverviewFilters =
    DEFAULT_FILTERS,
): UseKpiMtdTrendDataResult {
  const {
    region,
    amm,
    supervisor,
  } = filters;

  const queryConfig = useMemo(
    () =>
      cycleKey === null
        ? null
        : kpiMtdTrend({
            cycleKey,
            filters: {
              region,
              amm,
              supervisor,
            },
          }),
    [
      cycleKey,
      region,
      amm,
      supervisor,
    ],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection:
      queryConfig?.connection ??
      "unimeModel",
    query:
      queryConfig?.query ??
      "",
  });

  let rows: KpiMtdTrendRow[] = [];
  let validationError:
    string | null = null;

  if (
    queryConfig !== null &&
    data?.status === "success"
  ) {
    const queryColumnNames =
      new Set(
        data.table.columns.map(
          (column) => column.name,
        ),
      );

    const hasMissingColumn =
      REQUIRED_QUERY_COLUMNS.some(
        (columnName) =>
          !queryColumnNames.has(
            columnName,
          ),
      );

    if (hasMissingColumn) {
      validationError =
        KPI_MTD_TREND_INVALID_ERROR;
    } else if (
      data.table.rows.length > 0
    ) {
      const table = toDataTable(
        data.table,
        queryConfig.columnMetadata,
      );

      const columnIndexes = {
        Date:
          table.columns.findIndex(
            (column) =>
              column.name === "Date",
          ),
        successfulCallsMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "successfulCallsMtd",
          ),
        visitMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "visitMtd",
          ),
        timeSpendMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "timeSpendMtd",
          ),
        osaMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "osaMtd",
          ),
        qcMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "qcMtd",
          ),
        benchmark:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "benchmark",
          ),
      };

      const hasMissingMappedColumn =
        Object.values(
          columnIndexes,
        ).some(
          (index) => index === -1,
        );

      if (hasMissingMappedColumn) {
        validationError =
          KPI_MTD_TREND_INVALID_ERROR;
      } else {
        for (
          const row of table.rows
        ) {
          const Date = toDateKey(
            row[columnIndexes.Date],
          );

          const successfulCallsMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes
                  .successfulCallsMtd
              ],
            );
          const visitMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.visitMtd
              ],
            );
          const timeSpendMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes
                  .timeSpendMtd
              ],
            );
          const osaMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.osaMtd
              ],
            );
          const qcMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.qcMtd
              ],
            );
          const benchmark =
            toFiniteNumber(
              row[
                columnIndexes.benchmark
              ],
            );

          if (
            Date === null ||
            !successfulCallsMtd.valid ||
            !visitMtd.valid ||
            !timeSpendMtd.valid ||
            !osaMtd.valid ||
            !qcMtd.valid ||
            benchmark === null
          ) {
            validationError =
              KPI_MTD_TREND_INVALID_ERROR;
            rows = [];
            break;
          }

          const allValuesBlank =
            successfulCallsMtd.value ===
              null &&
            visitMtd.value === null &&
            timeSpendMtd.value ===
              null &&
            osaMtd.value === null &&
            qcMtd.value === null;

          if (allValuesBlank) {
            continue;
          }

          rows.push({
            Date,
            successfulCallsMtd:
              successfulCallsMtd.value,
            visitMtd:
              visitMtd.value,
            timeSpendMtd:
              timeSpendMtd.value,
            osaMtd:
              osaMtd.value,
            qcMtd:
              qcMtd.value,
            benchmark,
          });
        }

        rows.sort(
          (left, right) =>
            left.Date.localeCompare(
              right.Date,
            ),
        );
      }
    }
  }

  let errorMessage:
    string | null = null;

  if (cycleKey !== null) {
    if (error) {
      errorMessage =
        error.message;
    } else if (
      data?.status === "error"
    ) {
      errorMessage =
        data.error.message;
    } else {
      errorMessage =
        validationError;
    }
  }

  return {
    rows:
      isLoading
        ? []
        : rows,
    isLoading:
      cycleKey !== null &&
      isLoading,
    error: errorMessage,
    refetch,
  };
}
``

---

## File: `./src/feature/overview/hooks/useKpiMtdTrendData.spec.ts`

``typescript
import {
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  kpiMtdTrend,
} from "@/queries/kpimtd-trend";

import {
  useKpiMtdTrendData,
} from "./useKpiMtdTrendData";
import type {
  OverviewFilters,
} from "../types";

const {
  mockUseSemanticModelQuery,
} = vi.hoisted(() => ({
  mockUseSemanticModelQuery:
    vi.fn(),
}));

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      mockUseSemanticModelQuery,
  }),
);

const refetch =
  vi.fn(async () => undefined);

const queryColumns = [
  "[Date]",
  "[successfulCallsMtd]",
  "[visitMtd]",
  "[timeSpendMtd]",
  "[osaMtd]",
  "[qcMtd]",
  "[benchmark]",
];

function successResult(
  rows: unknown[][] = [
    [
      "2026-07-20T00:00:00",
      91.1,
      97.6,
      102.2,
      95.4,
      97.7,
      90,
    ],
    [
      "2026-07-19T00:00:00",
      89.8,
      96.9,
      101.4,
      94.9,
      97.1,
      90,
    ],
  ],
  columns: string[] =
    queryColumns,
) {
  return {
    data: {
      status: "success" as const,
      table: {
        columns: columns.map(
          (name) => ({
            name,
            dataType: "Double",
          }),
        ),
        rows,
      },
    },
    isLoading: false,
    error: undefined,
    refetch,
  };
}

describe(
  "useKpiMtdTrendData",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("queries the independent trend query with cycleKey", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      renderHook(
        () =>
          useKpiMtdTrendData(
            202608,
          ),
      );

      expect(
        mockUseSemanticModelQuery,
      ).toHaveBeenCalledOnce();

      expect(
        mockUseSemanticModelQuery,
      ).toHaveBeenCalledWith({
        connection: "unimeModel",
        query:
          kpiMtdTrend({
            cycleKey: 202608,
          }).query,
      });
    });

    it("rebuilds the trend query when cycleKey changes", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const filters: OverviewFilters = {
        region: "number:1",
        amm: "string:001",
        supervisor:
          "number:16365",
      };

      const { rerender } =
        renderHook(
          ({
            cycleKey,
          }: {
            cycleKey: number;
          }) =>
            useKpiMtdTrendData(
              cycleKey,
              filters,
            ),
          {
            initialProps: {
              cycleKey: 202607,
            },
          },
        );

      const previousQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      rerender({
        cycleKey: 202608,
      });

      const currentQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      expect(currentQuery).not.toBe(
        previousQuery,
      );
      expect(currentQuery).toContain(
        "202608",
      );
      expect(currentQuery).toContain(
        "'dimnv'[Region ID]",
      );
      expect(currentQuery).toContain(
        "'dimnv'[amm_id]",
      );
      expect(currentQuery).toContain(
        "'dimnv'[sup_id]",
      );
    });

    it("rebuilds the trend query when Supervisor changes", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const { rerender } =
        renderHook(
          ({
            supervisor,
          }: {
            supervisor:
              OverviewFilters["supervisor"];
          }) =>
            useKpiMtdTrendData(
              202608,
              {
                region: "all",
                amm: "all",
                supervisor,
              },
            ),
          {
            initialProps: {
              supervisor: "all" as
                OverviewFilters["supervisor"],
            },
          },
        );

      const allQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      rerender({
        supervisor:
          "number:16365",
      });

      const supervisorQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      expect(supervisorQuery).not.toBe(
        allQuery,
      );
      expect(supervisorQuery).toContain(
        "{ 16365 }",
      );
      expect(supervisorQuery).toContain(
        "'dimnv'[sup_id]",
      );
    });

    it("parses and sorts daily trend rows", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([
        {
          Date: "2026-07-19",
          successfulCallsMtd:
            89.8,
          visitMtd: 96.9,
          timeSpendMtd: 101.4,
          osaMtd: 94.9,
          qcMtd: 97.1,
          benchmark: 90,
        },
        {
          Date: "2026-07-20",
          successfulCallsMtd:
            91.1,
          visitMtd: 97.6,
          timeSpendMtd: 102.2,
          osaMtd: 95.4,
          qcMtd: 97.7,
          benchmark: 90,
        },
      ]);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("allows a KPI to be blank on an individual day", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([
            [
              "2026-07-20",
              null,
              97.6,
              102.2,
              95.4,
              97.7,
              90,
            ],
          ]),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows[0]
          .successfulCallsMtd,
      ).toBeNull();
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("rejects missing columns", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(
            [],
            queryColumns.slice(
              0,
              -1,
            ),
          ),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toBe(
        "Semantic Model trả dữ liệu xu hướng KPI MTD không hợp lệ",
      );
    });

    it("keeps an empty successful result as an empty trend", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([]),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not expose stale trend rows while loading", () => {
      mockUseSemanticModelQuery
        .mockReturnValue({
          data: undefined,
          isLoading: true,
          error: undefined,
          refetch,
        });

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.isLoading,
      ).toBe(true);
    });
  },
);
``

---

## File: `./src/feature/overview/hooks/useOverviewData.ts`

``typescript
import {
  useCallback,
  useMemo,
} from "react";

import type {
  DimDateCycleValue,
} from "@/queries/dim-date";
import type {
  KpiMtdTrendRow,
} from "@/queries/kpimtd-trend";

import {
  getOverviewDataByPeriod,
} from "../lib";
import type {
  OverviewData,
  OverviewFilters,
  OverviewKpi,
  OverviewKpiStatus,
  OverviewPeriod,
  TrendPoint,
} from "../types";
import {
  useKpiMtdData,
  type KpiMtdValues,
} from "./useKpiMtdData";
import {
  useKpiMtdTrendData,
} from "./useKpiMtdTrendData";

interface UseOverviewDataParams {
  period: OverviewPeriod;
  cycleKey: DimDateCycleValue | null;
  filters?: OverviewFilters;
}

interface UseOverviewDataResult {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const TEAM_KPI_BENCHMARK = 90;

type TrendValueKey =
  | "successfulCallsMtd"
  | "visitMtd"
  | "timeSpendMtd"
  | "osaMtd"
  | "qcMtd";

function getKpiStatus(
  percent: number | null,
): OverviewKpiStatus {
  if (percent === null) {
    return "neutral";
  }

  return percent >=
    TEAM_KPI_BENCHMARK
    ? "good"
    : "bad";
}

function createTrendPoints(
  rows: KpiMtdTrendRow[],
  valueKey: TrendValueKey,
): TrendPoint[] {
  return rows.flatMap(
    (row) => {
      const value =
        row[valueKey];

      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        return [];
      }

      return [
        {
          date: row.Date,
          value,
          benchmark:
            row.benchmark,
        },
      ];
    },
  );
}

function createTeamMtdKpis(
  values: KpiMtdValues,
  trendRows: KpiMtdTrendRow[],
): OverviewKpi[] {
  return [
    {
      id: "successful-calls",
      title: "Successful Calls",
      percent:
        values.successfulCallsMtd,
      issued:
        values.successfulCallsIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.successfulCallsMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "successfulCallsMtd",
      ),
    },
    {
      id: "beat",
      title:
        "Tần suất viếng thăm",
      percent: values.visitMtd,
      issued: values.visitIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.visitMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "visitMtd",
      ),
    },
    {
      id: "time",
      title: "Time Spend",
      percent:
        values.timeSpendMtd,
      issued:
        values.timeSpendIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.timeSpendMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "timeSpendMtd",
      ),
    },
    {
      id: "team-osa",
      title: "OSA",
      percent: values.osaMtd,
      issued: values.osaIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.osaMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "osaMtd",
      ),
    },
    {
      id: "qc",
      title: "QC",
      percent: values.qcMtd,
      issued: values.qcIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.qcMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "qcMtd",
      ),
    },
  ];
}

function mergeKpiMtdValues(
  base: OverviewData,
  values: KpiMtdValues,
  trendRows: KpiMtdTrendRow[],
): OverviewData {
  return {
    ...base,
    marketKpis:
      base.marketKpis.map(
        (kpi) =>
          kpi.id === "osa"
            ? {
                ...kpi,
                percent:
                  values.osaMtd,
                status: getKpiStatus(
                  values.osaMtd,
                ),
              }
            : kpi,
      ),
    teamKpis:
      createTeamMtdKpis(
        values,
        trendRows,
      ),
  };
}

export function useOverviewData({
  period,
  cycleKey,
  filters = {
    region: "all",
    amm: "all",
    supervisor: "all",
  },
}: UseOverviewDataParams):
  UseOverviewDataResult {
  const {
    values,
    isLoading,
    error: kpiMtdError,
    refetch: refetchKpiMtd,
  } = useKpiMtdData(
    cycleKey,
    filters,
  );

  const {
    rows: trendRows,
    isLoading: trendLoading,
    error: trendError,
    refetch: refetchTrend,
  } = useKpiMtdTrendData(
    cycleKey,
    filters,
  );

  const usableTrendRows =
    useMemo(
      () =>
        trendLoading ||
        trendError
          ? []
          : trendRows,
      [
        trendError,
        trendLoading,
        trendRows,
      ],
    );

  const { data, error } =
    useMemo<{
      data: OverviewData | null;
      error: string | null;
    }>(() => {
      if (period !== "mtd") {
        try {
          return {
            data:
              getOverviewDataByPeriod(
                period,
              ),
            error: null,
          };
        } catch (cause) {
          return {
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Không thể tải dữ liệu",
          };
        }
      }

      if (cycleKey === null) {
        return {
          data: null,
          error: null,
        };
      }

      if (isLoading) {
        return {
          data: null,
          error: null,
        };
      }

      if (kpiMtdError) {
        return {
          data: null,
          error: kpiMtdError,
        };
      }

      if (values == null) {
        return {
          data: null,
          error:
            "Không có dữ liệu KPI cho chu kỳ đã chọn",
        };
      }

      try {
        const base =
          getOverviewDataByPeriod(
            period,
          );

        return {
          data:
            mergeKpiMtdValues(
              base,
              values,
              usableTrendRows,
            ),
          error: null,
        };
      } catch (cause) {
        return {
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Không thể tải dữ liệu",
        };
      }
    }, [
      cycleKey,
      isLoading,
      kpiMtdError,
      period,
      usableTrendRows,
      values,
    ]);

  const reload =
    useCallback(async () => {
      await Promise.all([
        refetchKpiMtd(),
        refetchTrend(),
      ]);
    }, [
      refetchKpiMtd,
      refetchTrend,
    ]);

  return {
    data,
    loading:
      period === "mtd" &&
      cycleKey !== null &&
      isLoading,
    error:
      error ??
      (
        period === "mtd"
          ? kpiMtdError
          : null
      ),
    reload,
  };
}
``

---

## File: `./src/feature/overview/hooks/useOverviewData.spec.ts`

``typescript
import {
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  useOverviewData,
} from "./useOverviewData";

const {
  mockUseKpiMtdData,
  mockUseKpiMtdTrendData,
  refetchSummary,
  refetchTrend,
} = vi.hoisted(() => ({
  mockUseKpiMtdData: vi.fn(),
  mockUseKpiMtdTrendData:
    vi.fn(),
  refetchSummary:
    vi.fn(async () => undefined),
  refetchTrend:
    vi.fn(async () => undefined),
}));

vi.mock(
  "./useKpiMtdData",
  () => ({
    useKpiMtdData:
      mockUseKpiMtdData,
  }),
);

vi.mock(
  "./useKpiMtdTrendData",
  () => ({
    useKpiMtdTrendData:
      mockUseKpiMtdTrendData,
  }),
);

const semanticValues = {
  successfulCallsMtd: 93,
  successfulCallsIssued: 11,
  visitMtd: 0.27,
  visitIssued: 22,
  timeSpendMtd: 102,
  timeSpendIssued: 33,
  osaMtd: 95,
  osaIssued: 44,
  qcMtd: 99,
  qcIssued: 55,
};

const semanticTrendRows = [
  {
    Date: "2026-07-19",
    successfulCallsMtd: 89.8,
    visitMtd: 96.9,
    timeSpendMtd: 101.4,
    osaMtd: 94.9,
    qcMtd: 97.1,
    benchmark: 90,
  },
  {
    Date: "2026-07-20",
    successfulCallsMtd: 93,
    visitMtd: 97.6,
    timeSpendMtd: 102,
    osaMtd: 95,
    qcMtd: 99,
    benchmark: 90,
  },
];

describe(
  "useOverviewData",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows:
            semanticTrendRows,
          isLoading: false,
          error: null,
          refetch: refetchTrend,
        });
    });

    it("builds all five MTD Team KPIs from summary and trend semantic results", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis,
      ).toEqual([
        {
          id:
            "successful-calls",
          title:
            "Successful Calls",
          percent: 93,
          issued: 11,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 89.8,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 93,
              benchmark: 90,
            },
          ],
        },
        {
          id: "beat",
          title:
            "Tần suất viếng thăm",
          percent: 0.27,
          issued: 22,
          issuedLabel: "NV",
          status: "bad",
          trend: [
            {
              date:
                "2026-07-19",
              value: 96.9,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 97.6,
              benchmark: 90,
            },
          ],
        },
        {
          id: "time",
          title:
            "Time Spend",
          percent: 102,
          issued: 33,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 101.4,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 102,
              benchmark: 90,
            },
          ],
        },
        {
          id: "team-osa",
          title: "OSA",
          percent: 95,
          issued: 44,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 94.9,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 95,
              benchmark: 90,
            },
          ],
        },
        {
          id: "qc",
          title: "QC",
          percent: 99,
          issued: 55,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 97.1,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 99,
              benchmark: 90,
            },
          ],
        },
      ]);

      expect(
        result.current.data
          ?.marketKpis.find(
            (kpi) =>
              kpi.id === "osa",
          )?.percent,
      ).toBe(95);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("uses 90 as the good/bad threshold", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            ...semanticValues,
            successfulCallsMtd:
              90,
            qcMtd: 89.9,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis[0].status,
      ).toBe("good");
      expect(
        result.current.data
          ?.teamKpis[4].status,
      ).toBe("bad");
    });

    it("does not expose mock Overview data while KPI summary is loading", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: true,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.loading,
      ).toBe(true);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not expose mock Overview data when KPI summary fails", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error:
            "Query failed",
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.loading,
      ).toBe(false);
      expect(
        result.current.error,
      ).toBe(
        "Query failed",
      );
    });

    it("keeps summary values visible when trend query fails", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows: [],
          isLoading: false,
          error:
            "Trend failed",
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.trend.length ===
              0,
          ),
      ).toBe(true);
      expect(
        result.current.data
          ?.teamKpis[0].percent,
      ).toBe(93);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not show stale trend while the selected cycle trend is loading", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows:
            semanticTrendRows,
          isLoading: true,
          error: null,
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.trend.length ===
              0,
          ),
      ).toBe(true);
    });

    it("does not expose mock Overview data when KPI MTD is unavailable", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.error,
      ).toBe(
        "Không có dữ liệu KPI cho chu kỳ đã chọn",
      );
    });

    it("keeps non-MTD periods on their existing static path", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error:
            "Query failed",
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows: [],
          isLoading: false,
          error:
            "Trend failed",
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "today",
              cycleKey: null,
            }),
        );

      expect(
        result.current.data,
      ).not.toBeNull();
      expect(
        result.current.error,
      ).toBeNull();
    });
    it("keeps available KPI values when individual summary cells are BLANK", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            ...semanticValues,
            visitMtd: null,
            osaIssued: null,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.error,
      ).toBeNull();

      expect(
        result.current.data,
      ).not.toBeNull();

      expect(
        result.current.data
          ?.teamKpis[0].percent,
      ).toBe(93);

      expect(
        result.current.data
          ?.teamKpis[1],
      ).toMatchObject({
        percent: null,
        issued: 22,
        status: "neutral",
      });

      expect(
        result.current.data
          ?.teamKpis[3],
      ).toMatchObject({
        percent: 95,
        issued: null,
        status: "good",
      });

      expect(
        result.current.data
          ?.teamKpis[4].percent,
      ).toBe(99);
    });

    it("keeps a complete KPI table when all ten summary cells are BLANK", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            successfulCallsMtd: null,
            successfulCallsIssued:
              null,
            visitMtd: null,
            visitIssued: null,
            timeSpendMtd: null,
            timeSpendIssued: null,
            osaMtd: null,
            osaIssued: null,
            qcMtd: null,
            qcIssued: null,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.error,
      ).toBeNull();
      expect(
        result.current.data
          ?.teamKpis,
      ).toHaveLength(5);
      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.percent === null &&
              kpi.issued === null &&
              kpi.status ===
                "neutral",
          ),
      ).toBe(true);
      expect(
        result.current.data
          ?.marketKpis.find(
            (kpi) =>
              kpi.id === "osa",
          ),
      ).toMatchObject({
        percent: null,
        status: "neutral",
      });
    });

    it("passes the same applied filters to summary and trend hooks", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const filters = {
        region: "number:1",
        amm: "string:001",
        supervisor: "string:S01",
      } as const;

      renderHook(
        () =>
          useOverviewData({
            period: "mtd",
            cycleKey: 202608,
            filters,
          }),
      );

      expect(
        mockUseKpiMtdData,
      ).toHaveBeenCalledWith(
        202608,
        filters,
      );

      expect(
        mockUseKpiMtdTrendData,
      ).toHaveBeenCalledWith(
        202608,
        filters,
      );
    });
  },
);
``

---

## File: `./src/feature/overview/types/overview.ts`

``typescript
import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

export type OverviewPeriod =
  | "today"
  | "seven-days"
  | "mtd";

export type OverviewKpiStatus =
  | "good"
  | "warn"
  | "bad"
  | "neutral";

export type OverviewRoute =
  | "overview"
  | "market"
  | "team"
  | "profile"
  | "userguide";

export interface TrendPoint {
  value: number;
  benchmark?: number;
  date?: string;
}

export interface OverviewFilters {
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

export interface FilterOption {
  label: string;
  value: EncodedDimensionValue;
}

export interface OverviewKpi {
  id: string;
  title: string;
  percent: number | null;
  issued: number | null;
  issuedLabel: string;
  status: OverviewKpiStatus;
  trend: TrendPoint[];
  previousPercent?: number | null;
}

export interface CoverageMetric {
  id: string;
  title: string;
  percent: number;
  actual: number;
  target: number;
  missingLabel: string;
}

export interface OverviewData {
  coverage: CoverageMetric[];
  marketKpis: OverviewKpi[];
  teamKpis: OverviewKpi[];
}

export interface NavigationItem {
  id: OverviewRoute;
  label: string;
}
``

---

## File: `./src/feature/overview/lib/constants.ts`

``typescript
import type {
  NavigationItem,
  OverviewFilters,
  OverviewPeriod,
} from "../types";

export const OVERVIEW_PERIODS:
  OverviewPeriod[] = [
    "today",
    "seven-days",
    "mtd",
  ];

export const DEFAULT_OVERVIEW_FILTERS:
  OverviewFilters = {
    region: "all",
    amm: "all",
    supervisor: "all",
  };

export const NAVIGATION_ITEMS:
  NavigationItem[] = [
    {
      id: "overview",
      label: "Tổng quan",
    },
    {
      id: "market",
      label: "Thị trường",
    },
    {
      id: "team",
      label: "Đội ngũ",
    },
    {
      id: "profile",
      label: "Hồ sơ",
    },
    {
      id: "userguide",
      label: "Hướng dẫn",
    },
  ];

// OVERVIEW_PERIOD_AVAILABILITY_START

/**
 * Feature flag tạm thời cho các mode Overview.
 *
 * Nội dung và data của Today/7 Days vẫn được giữ nguyên.
 * Chỉ chặn việc chuyển mode tại UI.
 */
export const OVERVIEW_PERIOD_AVAILABILITY:
  Record<OverviewPeriod, boolean> = {
    today: false,
    "seven-days": false,
    mtd: true,
  };

export const OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE =
  "Chức năng này chưa được triển khai";

export function isOverviewPeriodEnabled(
  period: OverviewPeriod,
): boolean {
  return OVERVIEW_PERIOD_AVAILABILITY[
    period
  ];
}

// OVERVIEW_PERIOD_AVAILABILITY_END
``

---

## File: `./src/queries/org-filter.ts`

``typescript
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
``

---

## File: `./src/queries/org-filter.spec.ts`

``typescript
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
``

---

## File: `./src/queries/dim-date.ts`

``typescript
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import dimDateDax from "./dimdate.dax?raw";

const connection = "unimeModel";

export type DimDateCycleValue =
  string | number;

export type DimDateValue =
  string | Date;

export type DimDateRow = {
  cycleKey: DimDateCycleValue;
  cycleLabel: string;
  cycleStartDate: DimDateValue;
  cycleEndDate: DimDateValue;
  cycleSort: DimDateCycleValue;
  isLatestCycle: boolean;
};

export const dimDateQuery = dimDateDax.trim();

export const dimDateColumnMetadata: ColumnMetadataMap = {
  "[cycleKey]": {
    name: "cycleKey",
    displayName: "Khóa chu kỳ KPI",
  },

  "[cycleLabel]": {
    name: "cycleLabel",
    displayName: "Chu kỳ KPI",
  },

  "[cycleStartDate]": {
    name: "cycleStartDate",
    displayName: "Ngày bắt đầu chu kỳ",
  },

  "[cycleEndDate]": {
    name: "cycleEndDate",
    displayName: "Ngày kết thúc chu kỳ",
  },

  "[cycleSort]": {
    name: "cycleSort",
    displayName: "Thứ tự chu kỳ",
  },

  "[isLatestCycle]": {
    name: "isLatestCycle",
    displayName: "Chu kỳ mới nhất",
  },
};

export function dimDate() {
  return {
    connection,
    query: dimDateQuery,
    columnMetadata: dimDateColumnMetadata,
  };
}
``

---

## File: `./src/queries/dimdate.dax`

``dax
DEFINE
    VAR _LatestDate =
        MAXX(
            ALL('Date'),
            'Date'[Date]
        )

    VAR _LatestCycleKey =
        MAXX(
            FILTER(
                ALL('Date'),
                'Date'[Date] = _LatestDate
            ),
            'Date'[Chu kỳ KPI Key]
        )

    VAR _ValidDateRows =
        FILTER(
            ALL('Date'),
            NOT ISBLANK('Date'[Chu kỳ KPI Key])
                && NOT ISBLANK('Date'[Chu kỳ KPI])
        )

    VAR _Cycles =
        GROUPBY(
            _ValidDateRows,
            'Date'[Chu kỳ KPI Key],
            'Date'[Chu kỳ KPI],

            "cycleStartDate",
                MINX(
                    CURRENTGROUP(),
                    'Date'[Date]
                ),

            "cycleEndDate",
                MAXX(
                    CURRENTGROUP(),
                    'Date'[Date]
                )
        )

EVALUATE
SELECTCOLUMNS(
    ADDCOLUMNS(
        _Cycles,

        "cycleSort",
            'Date'[Chu kỳ KPI Key],

        "isLatestCycle",
            'Date'[Chu kỳ KPI Key]
                = _LatestCycleKey
    ),

    "cycleKey",
        'Date'[Chu kỳ KPI Key],

    "cycleLabel",
        'Date'[Chu kỳ KPI],

    "cycleStartDate",
        [cycleStartDate],

    "cycleEndDate",
        [cycleEndDate],

    "cycleSort",
        [cycleSort],

    "isLatestCycle",
        [isLatestCycle]
)

ORDER BY
    [cycleSort] ASC
``

