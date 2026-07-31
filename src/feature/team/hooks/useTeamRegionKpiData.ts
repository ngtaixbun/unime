import {
  useMemo,
} from "react";

import type {
  CachedQueryResult,
  QueryTable,
} from "@microsoft/fabric-app-data";

import type {
  OrganizationFilters,
} from "@/components/organization-filter";
import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";

import {
  dimRegion,
} from "@/queries/dim-region";

import {
  kpiMtd,
} from "@/queries/kpimtd";

import {
  encodeDimensionValue,
  type EncodedDimensionValue,
} from "@/queries/org-filter";

import {
  TEAM_REGION_ORDER,
} from "../lib";

interface SemanticRegion {
  key: string;
  regionId:
    string | number;
  label: string;
  filterValue:
    EncodedDimensionValue;
}

export interface TeamRegionKpiRow {
  key: string;
  regionId:
    string | number;
  entityId:
    string | number;
  name: string;
  region: string;
  value:
    number | null;
  gap:
    number | null;
  nvFail:
    number | null;
  contributionNvFail:
    number | null;
  countNv:
    number | null;
  contributionNv:
    number | null;
}

export interface TeamKpiEntityRow {
  key: string;
  entityId:
    string | number;
  name: string;
  region: string;
  value:
    number | null;
  gap:
    number | null;
  nvFail:
    number | null;
  contributionNvFail:
    number | null;
  countNv:
    number | null;
  contributionNv:
    number | null;
}

export interface UseTeamRegionKpiDataResult {
  rows:
    TeamRegionKpiRow[];
  employeeCount:
    number | null;
  isLoading:
    boolean;
  error:
    string | null;
  retry:
    () => Promise<void>;
}

interface ParsedRegionList {
  regions:
    SemanticRegion[];
  error:
    string | null;
}

interface ParsedKpiRow {
  values:
    Omit<
      TeamRegionKpiRow,
      | "key"
      | "regionId"
      | "entityId"
      | "name"
      | "region"
    > | null;
  error:
    string | null;
}

const DIM_REGION_QUERY =
  dimRegion();

const KPI_COLUMNS = [
  "[mtdKpiSelected]",
  "[gap]",
  "[nvFail]",
  "[contributionNvFail]",
  "[countNv]",
  "[contributionNv]",
] as const;

function getResultError(
  data:
    CachedQueryResult |
    undefined,
  error:
    Error |
    undefined,
): string | null {
  return (
    error?.message ??
    (
      data?.status ===
        "error"
        ? data.error.message
        : null
    )
  );
}

function getRegionOrder(
  value: string,
): number {
  const index =
    TEAM_REGION_ORDER.indexOf(
      value as
        (typeof TEAM_REGION_ORDER)[number],
    );

  return index === -1
    ? Number.MAX_SAFE_INTEGER
    : index;
}

export function parseTeamRegions(
  table:
    QueryTable,
): ParsedRegionList {
  const idIndex =
    table.columns.findIndex(
      (column) =>
        column.name ===
        "[regionId]",
    );

  const labelIndex =
    table.columns.findIndex(
      (column) =>
        column.name ===
        "[regionLabel]",
    );

  if (
    idIndex === -1 ||
    labelIndex === -1
  ) {
    return {
      regions: [],
      error:
        "Semantic Model trả sai cấu trúc dim-region.",
    };
  }

  const seen =
    new Set<string>();

  const regions:
    SemanticRegion[] = [];

  for (
    const row of
    table.rows
  ) {
    const rawId =
      row[idIndex];

    const rawLabel =
      row[labelIndex];

    if (
      (
        typeof rawId !==
          "string" &&
        typeof rawId !==
          "number"
      ) ||
      typeof rawLabel !==
        "string"
    ) {
      continue;
    }

    const label =
      rawLabel.trim();

    if (
      label === ""
    ) {
      continue;
    }

    const filterValue =
      encodeDimensionValue(
        rawId,
      );

    if (
      seen.has(
        filterValue,
      )
    ) {
      return {
        regions: [],
        error:
          `Semantic Model trả trùng Region ID: ${String(rawId)}.`,
      };
    }

    seen.add(
      filterValue,
    );

    regions.push({
      key:
        filterValue,
      regionId:
        rawId,
      label,
      filterValue,
    });
  }

  regions.sort(
    (
      left,
      right,
    ) =>
      getRegionOrder(
        left.label,
      ) -
        getRegionOrder(
          right.label,
        ) ||
      left.label.localeCompare(
        right.label,
        "vi",
      ),
  );

  if (
    regions.length >
    4
  ) {
    return {
      regions: [],
      error:
        "Team hiện chỉ hỗ trợ tối đa 4 khu vực.",
    };
  }

  return {
    regions,
    error: null,
  };
}

function toNullableNumber(
  value: unknown,
): {
  valid: boolean;
  value:
    number | null;
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
    typeof value ===
    "number"
      ? value
      : Number(
          value,
        );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

export function parseTeamKpiRow(
  table:
    QueryTable,
): ParsedKpiRow {
  const indexes =
    Object.fromEntries(
      KPI_COLUMNS.map(
        (columnName) => [
          columnName,
          table.columns.findIndex(
            (column) =>
              column.name ===
              columnName,
          ),
        ],
      ),
    ) as Record<
      (typeof KPI_COLUMNS)[number],
      number
    >;

  if (
    Object.values(
      indexes,
    ).some(
      (index) =>
        index === -1,
    )
  ) {
    return {
      values: null,
      error:
        "Semantic Model trả thiếu cột KPI.",
    };
  }

  const row =
    table.rows[0];

  if (!row) {
    return {
      values: {
        value: null,
        gap: null,
        nvFail: null,
        contributionNvFail:
          null,
        countNv: null,
        contributionNv:
          null,
      },
      error: null,
    };
  }

  const parsed = {
    value:
      toNullableNumber(
        row[
          indexes[
            "[mtdKpiSelected]"
          ]
        ],
      ),

    gap:
      toNullableNumber(
        row[
          indexes[
            "[gap]"
          ]
        ],
      ),

    nvFail:
      toNullableNumber(
        row[
          indexes[
            "[nvFail]"
          ]
        ],
      ),

    contributionNvFail:
      toNullableNumber(
        row[
          indexes[
            "[contributionNvFail]"
          ]
        ],
      ),

    countNv:
      toNullableNumber(
        row[
          indexes[
            "[countNv]"
          ]
        ],
      ),

    contributionNv:
      toNullableNumber(
        row[
          indexes[
            "[contributionNv]"
          ]
        ],
      ),
  };

  if (
    Object.values(
      parsed,
    ).some(
      (item) =>
        !item.valid,
    )
  ) {
    return {
      values: null,
      error:
        "Semantic Model trả giá trị KPI không hợp lệ.",
    };
  }

  return {
    values: {
      value:
        parsed.value.value,
      gap:
        parsed.gap.value,
      nvFail:
        parsed.nvFail.value,
      contributionNvFail:
        parsed
          .contributionNvFail
          .value,
      countNv:
        parsed.countNv.value,
      contributionNv:
        parsed
          .contributionNv
          .value,
    },
    error: null,
  };
}

function useRegionKpiSlot({
  cycleKey,
  kpiId,
  region,
  filters,
}: {
  cycleKey:
    string | number | null;
  kpiId:
    number | null;
  region:
    SemanticRegion | null;
  filters:
    OrganizationFilters;
}) {
  const queryConfig =
    useMemo(
      () =>
        cycleKey === null ||
        kpiId === null ||
        region === null
          ? null
          : kpiMtd({
              cycleKey,
              kpiId,
              filters: {
                region:
                  region.filterValue,
                amm:
                  filters.amm,
                supervisor:
                  filters.supervisor,
              },
            }),
      [
        cycleKey,
        kpiId,
        region,
        filters.amm,
        filters.supervisor,
      ],
    );

  const result =
    useSemanticModelQuery({
      connection:
        queryConfig?.connection ??
        "unimeModel",

      query:
        queryConfig?.query ??
        "",
      columnMetadata:
        queryConfig
          ?.columnMetadata,

      backendRequest:
        queryConfig === null ||
        cycleKey === null ||
        kpiId === null ||
        region === null
          ? undefined
          : {
              queryId:
                "overview-kpi-summary",

              params: {
                cycleKey,
                kpiId,
                region:
                  region.filterValue,
                amm:
                  filters.amm,
                supervisor:
                  filters.supervisor,
              },
            },
    });

  const parsed =
    useMemo(
      () =>
        result.data?.status ===
        "success"
          ? parseTeamKpiRow(
              result.data.table,
            )
          : {
              values: null,
              error: null,
            },
      [result.data],
    );

  return {
    region,
    data:
      parsed.values,
    isLoading:
      queryConfig !== null &&
      result.isLoading,
    error:
      getResultError(
        result.data,
        result.error,
      ) ??
      parsed.error,
    retry:
      result.refetch,
  };
}

export function normalizeTeamKpiContributions<
  Row extends TeamKpiEntityRow,
>(
  rows: Row[],
): Row[] {
  const totalNv =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        (
          row.countNv ??
          0
        ),
      0,
    );

  const totalNvFail =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        (
          row.nvFail ??
          0
        ),
      0,
    );

  return rows.map(
    (row) => ({
      ...row,

      contributionNv:
        row.countNv ===
          null ||
        totalNv <= 0
          ? null
          : row.countNv /
            totalNv,

      contributionNvFail:
        row.nvFail ===
          null ||
        totalNvFail <= 0
          ? null
          : row.nvFail /
            totalNvFail,
    }),
  );
}

export function normalizeTeamRegionContributions(
  rows:
    TeamRegionKpiRow[],
): TeamRegionKpiRow[] {
  return normalizeTeamKpiContributions(
    rows,
  );
}

export function useTeamRegionKpiData({
  cycleKey,
  kpiId,
  filters,
  enabled = true,
}: {
  cycleKey:
    string | number | null;
  kpiId:
    number | null;
  filters:
    OrganizationFilters;
  enabled?: boolean;
}): UseTeamRegionKpiDataResult {
  const dimRegionResult =
    useSemanticModelQuery({
      connection:
        DIM_REGION_QUERY
          .connection,

      query:
        DIM_REGION_QUERY
          .query,
      columnMetadata:
        DIM_REGION_QUERY
          .columnMetadata,

      backendRequest: {
        queryId:
          "dim-region",

        params: {},
      },
      enabled,
    });

  const parsedRegions =
    useMemo(
      () =>
        dimRegionResult.data
          ?.status ===
        "success"
          ? parseTeamRegions(
              dimRegionResult
                .data.table,
            )
          : {
              regions: [],
              error: null,
            },
      [
        dimRegionResult.data,
      ],
    );

  const visibleRegions =
    useMemo(
      () =>
        filters.region !==
          "all"
          ? parsedRegions
              .regions
              .filter(
                (region) =>
                  region.filterValue ===
                  filters.region,
              )
          : parsedRegions
              .regions,
      [
        parsedRegions.regions,
        filters.region,
      ],
    );

  const first =
    useRegionKpiSlot({
      cycleKey,
      kpiId,
      region:
        enabled
          ? visibleRegions[0] ??
            null
          : null,
      filters,
    });

  const second =
    useRegionKpiSlot({
      cycleKey,
      kpiId,
      region:
        enabled
          ? visibleRegions[1] ??
            null
          : null,
      filters,
    });

  const third =
    useRegionKpiSlot({
      cycleKey,
      kpiId,
      region:
        enabled
          ? visibleRegions[2] ??
            null
          : null,
      filters,
    });

  const fourth =
    useRegionKpiSlot({
      cycleKey,
      kpiId,
      region:
        enabled
          ? visibleRegions[3] ??
            null
          : null,
      filters,
    });

  const slots = [
    first,
    second,
    third,
    fourth,
  ];

  const error =
    getResultError(
      dimRegionResult.data,
      dimRegionResult.error,
    ) ??
    parsedRegions.error ??
    slots.find(
      (slot) =>
        slot.error !==
        null,
    )?.error ??
    null;

  const isLoading =
    dimRegionResult
      .isLoading ||
    slots.some(
      (slot) =>
        slot.isLoading,
    );

  const rawRows =
    isLoading ||
    error !== null
      ? []
      : slots.flatMap(
          (slot) => {
            if (
              slot.region ===
                null ||
              slot.data ===
                null
            ) {
              return [];
            }

            return [
              {
                key:
                  slot.region
                    .key,
                regionId:
                  slot.region
                    .regionId,
                entityId:
                  slot.region
                    .regionId,
                name:
                  slot.region
                    .label,
                region:
                  slot.region
                    .label,
                ...slot.data,
              },
            ];
          },
        );

  // Mỗi Region được query riêng nên contribution từ DAX
  // chỉ nhìn thấy một Region và thường trả 100%.
  // FE chuẩn hóa lại contribution trên tập Region đang hiển thị.
  const rows =
    normalizeTeamRegionContributions(
      rawRows,
    );

  const employeeCount =
    rows.length === 0
      ? null
      : rows.reduce(
          (
            total,
            row,
          ) =>
            total +
            (
              row.countNv ??
              0
            ),
          0,
        );

  const retry =
    async () => {
      await Promise.all([
        dimRegionResult
          .refetch(),

        ...slots
          .filter(
            (slot) =>
              slot.region !==
              null,
          )
          .map(
            (slot) =>
              slot.retry(),
          ),
      ]);
    };

  return {
    rows,
    employeeCount,
    isLoading:
      enabled &&
      cycleKey !== null &&
      kpiId !== null &&
      isLoading,
    error:
      enabled
        ? error
        : null,
    retry,
  };
}
