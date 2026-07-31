import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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
  dimAmm,
} from "@/queries/dimamm";
import {
  kpiMtd,
} from "@/queries/kpimtd";
import {
  encodeDimensionValue,
  type EncodedDimensionValue,
} from "@/queries/org-filter";

import {
  normalizeTeamKpiContributions,
  parseTeamKpiRow,
  parseTeamRegions,
  type TeamKpiEntityRow,
} from "./useTeamRegionKpiData";

export interface SemanticAmm {
  key: string;
  ammId:
    string | number;
  label: string;
  regionId:
    string | number | null;
  filterValue:
    EncodedDimensionValue;
  regionFilterValue:
    EncodedDimensionValue | null;
}

export interface TeamAmmKpiRow
  extends TeamKpiEntityRow {
  ammId:
    string | number;
  regionId:
    string | number | null;
  regionFilterValue:
    EncodedDimensionValue | null;
}

export interface UseTeamAmmKpiDataResult {
  rows:
    TeamAmmKpiRow[];
  employeeCount:
    number | null;
  isLoading:
    boolean;
  error:
    string | null;
  retry:
    () => Promise<void>;
  queryElements:
    ReactNode;
}

interface ParsedAmmList {
  amms:
    SemanticAmm[];
  error:
    string | null;
}

interface TeamAmmQuerySnapshot {
  collectionKey: string;
  row:
    TeamAmmKpiRow | null;
  isLoading:
    boolean;
  error:
    string | null;
  retry:
    () => Promise<void>;
}

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

function isDimensionId(
  value: unknown,
): value is string | number {
  return (
    (
      typeof value ===
        "number" &&
      Number.isFinite(value)
    ) ||
    (
      typeof value ===
        "string" &&
      value.trim() !== ""
    )
  );
}

export function parseTeamAmms(
  table:
    QueryTable,
): ParsedAmmList {
  const idIndex =
    table.columns.findIndex(
      (column) =>
        column.name ===
        "[ammId]",
    );
  const labelIndex =
    table.columns.findIndex(
      (column) =>
        column.name ===
        "[ammLabel]",
    );
  const regionIdIndex =
    table.columns.findIndex(
      (column) =>
        column.name ===
        "[regionId]",
    );

  if (
    idIndex === -1 ||
    labelIndex === -1 ||
    regionIdIndex === -1
  ) {
    return {
      amms: [],
      error:
        "Semantic Model trả sai cấu trúc dim-amm.",
    };
  }

  const seen =
    new Set<
      EncodedDimensionValue
    >();
  const amms:
    SemanticAmm[] = [];

  for (
    const row of
    table.rows
  ) {
    const rawId =
      row[idIndex];
    const rawLabel =
      row[labelIndex];
    const rawRegionId =
      row[regionIdIndex];

    if (
      !isDimensionId(
        rawId,
      ) ||
      typeof rawLabel !==
        "string"
    ) {
      continue;
    }

    const label =
      rawLabel.trim();

    if (!label) {
      continue;
    }

    if (
      rawRegionId !==
        null &&
      rawRegionId !==
        undefined &&
      rawRegionId !==
        "" &&
      !isDimensionId(
        rawRegionId,
      )
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
        amms: [],
        error:
          `Semantic Model trả trùng AMM ID: ${String(rawId)}.`,
      };
    }

    seen.add(
      filterValue,
    );

    const regionId =
      isDimensionId(
        rawRegionId,
      )
        ? rawRegionId
        : null;

    amms.push({
      key:
        filterValue,
      ammId:
        rawId,
      label,
      regionId,
      filterValue,
      regionFilterValue:
        regionId === null
          ? null
          : encodeDimensionValue(
              regionId,
            ),
    });
  }

  return {
    amms,
    error: null,
  };
}

export function selectVisibleTeamAmms(
  amms:
    SemanticAmm[],
  filters:
    OrganizationFilters,
): SemanticAmm[] {
  return amms.filter(
    (amm) =>
      (
        filters.region ===
          "all" ||
        amm.regionFilterValue ===
          filters.region
      ) &&
      (
        filters.amm ===
          "all" ||
        amm.filterValue ===
          filters.amm
      ),
  );
}

export function normalizeTeamAmmContributions(
  rows:
    TeamAmmKpiRow[],
): TeamAmmKpiRow[] {
  return normalizeTeamKpiContributions(
    rows,
  );
}

function TeamAmmKpiQueryItem({
  collectionKey,
  cycleKey,
  kpiId,
  amm,
  filters,
  onStateChange,
}: {
  collectionKey: string;
  cycleKey:
    string | number;
  kpiId: number;
  amm: SemanticAmm;
  filters:
    OrganizationFilters;
  onStateChange:
    (
      key: string,
      snapshot:
        TeamAmmQuerySnapshot,
    ) => void;
}) {
  const regionFilter =
    filters.region ===
      "all"
      ? amm.regionFilterValue ??
        "all"
      : filters.region;

  const queryConfig =
    useMemo(
      () =>
        kpiMtd({
          cycleKey,
          kpiId,
          filters: {
            region:
              regionFilter,
            amm:
              amm.filterValue,
            supervisor:
              filters.supervisor,
          },
        }),
      [
        amm.filterValue,
        cycleKey,
        filters.supervisor,
        kpiId,
        regionFilter,
      ],
    );

  const result =
    useSemanticModelQuery({
      connection:
        queryConfig.connection,
      query:
        queryConfig.query,
      columnMetadata:
        queryConfig
          .columnMetadata,
      backendRequest: {
        queryId:
          "overview-kpi-summary",
        params: {
          cycleKey,
          kpiId,
          region:
            regionFilter,
          amm:
            amm.filterValue,
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
      [
        result.data,
      ],
    );

  const error =
    getResultError(
      result.data,
      result.error,
    ) ??
    parsed.error;

  useEffect(
    () => {
      onStateChange(
        amm.key,
        {
          collectionKey,
          row:
            parsed.values ===
              null
              ? null
              : {
                  key:
                    amm.key,
                  entityId:
                    amm.ammId,
                  ammId:
                    amm.ammId,
                  name:
                    amm.label,
                  region:
                    amm.regionFilterValue ??
                    "",
                  regionId:
                    amm.regionId,
                  regionFilterValue:
                    amm.regionFilterValue,
                  ...parsed.values,
                },
          isLoading:
            result.isLoading,
          error,
          retry:
            result.refetch,
        },
      );
    },
    [
      amm,
      collectionKey,
      error,
      onStateChange,
      parsed.values,
      result.isLoading,
      result.refetch,
    ],
  );

  return null;
}

export function useTeamAmmKpiData({
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
}): UseTeamAmmKpiDataResult {
  const dimensionConfig =
    useMemo(
      () =>
        dimAmm({
          region:
            filters.region,
        }),
      [
        filters.region,
      ],
    );

  const dimensionResult =
    useSemanticModelQuery({
      connection:
        dimensionConfig.connection,
      query:
        dimensionConfig.query,
      columnMetadata:
        dimensionConfig
          .columnMetadata,
      backendRequest: {
        queryId:
          "dim-amm",
        params: {
          region:
            filters.region,
        },
      },
      enabled,
    });

  const regionDimensionResult =
    useSemanticModelQuery({
      connection:
        dimRegion().connection,
      query:
        dimRegion().query,
      columnMetadata:
        dimRegion()
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
        regionDimensionResult
          .data?.status ===
        "success"
          ? parseTeamRegions(
              regionDimensionResult
                .data.table,
            )
          : {
              regions: [],
              error: null,
            },
      [
        regionDimensionResult
          .data,
      ],
    );

  const regionLabelByFilterValue =
    useMemo(
      () =>
        new Map(
          parsedRegions.regions.map(
            (region) => [
              region.filterValue,
              region.label,
            ],
          ),
        ),
      [
        parsedRegions.regions,
      ],
    );

  const parsedAmms =
    useMemo(
      () =>
        dimensionResult.data
          ?.status ===
        "success"
          ? parseTeamAmms(
              dimensionResult
                .data.table,
            )
          : {
              amms: [],
              error: null,
            },
      [
        dimensionResult.data,
      ],
    );

  const visibleAmms =
    useMemo(
      () =>
        selectVisibleTeamAmms(
          parsedAmms.amms,
          filters,
        ),
      [
        filters,
        parsedAmms.amms,
      ],
    );

  const collectionKey =
    [
      enabled
        ? "enabled"
        : "disabled",
      String(cycleKey),
      String(kpiId),
      filters.region,
      filters.amm,
      filters.supervisor,
      ...visibleAmms.map(
        (amm) =>
          `${amm.key}@${String(amm.regionFilterValue)}`,
      ),
    ].join("|");

  const [
    itemStates,
    setItemStates,
  ] = useState<
    ReadonlyMap<
      string,
      TeamAmmQuerySnapshot
    >
  >(
    () => new Map(),
  );

  const handleStateChange =
    useCallback(
      (
        key: string,
        snapshot:
          TeamAmmQuerySnapshot,
      ) => {
        setItemStates(
          (current) => {
            const previous =
              current.get(
                key,
              );

            if (
              previous ===
              snapshot
            ) {
              return current;
            }

            const next =
              new Map(
                current,
              );
            next.set(
              key,
              snapshot,
            );
            return next;
          },
        );
      },
      [],
    );

  const activeStates =
    visibleAmms.map(
      (amm) => {
        const state =
          itemStates.get(
            amm.key,
          );

        return state
          ?.collectionKey ===
            collectionKey
          ? state
          : null;
      },
    );

  const dimensionError =
    getResultError(
      dimensionResult.data,
      dimensionResult.error,
    ) ??
    parsedAmms.error ??
    getResultError(
      regionDimensionResult.data,
      regionDimensionResult.error,
    ) ??
    parsedRegions.error;

  const itemError =
    activeStates.find(
      (
        state,
      ): state is TeamAmmQuerySnapshot =>
        state?.error !==
          null &&
        state?.error !==
          undefined,
    )?.error ??
    null;

  const error =
    enabled
      ? dimensionError ??
        itemError
      : null;

  const hasQueryPrerequisites =
    enabled &&
    cycleKey !== null &&
    kpiId !== null;

  const hasPendingItem =
    hasQueryPrerequisites &&
    visibleAmms.length >
      0 &&
    activeStates.some(
      (state) =>
        state === null ||
        state.isLoading,
    );

  const isLoading =
    error === null &&
    hasQueryPrerequisites &&
    (
      dimensionResult
        .isLoading ||
      regionDimensionResult
        .isLoading ||
      (
        dimensionResult.data ===
          undefined &&
        dimensionResult.error ===
          undefined
      ) ||
      (
        regionDimensionResult
          .data ===
          undefined &&
        regionDimensionResult
          .error ===
          undefined
      ) ||
      hasPendingItem
    );

  const rawRows =
    !hasQueryPrerequisites ||
    isLoading ||
    error !== null
      ? []
      : activeStates.flatMap(
          (state) =>
            state?.row
              ? [
                  state.row,
                ]
              : [],
        );

  const rows =
    normalizeTeamAmmContributions(
      rawRows.map(
        (row) => ({
          ...row,
          region:
            row.regionFilterValue ===
              null
              ? "—"
              : regionLabelByFilterValue.get(
                  row.regionFilterValue,
                ) ??
                String(
                  row.regionId ??
                    "—",
                ),
        }),
      ),
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
    useCallback(
      async () => {
        await Promise.all([
          dimensionResult
            .refetch(),
          regionDimensionResult
            .refetch(),
          ...activeStates.flatMap(
            (state) =>
              state
                ? [
                    state.retry(),
                  ]
                : [],
          ),
        ]);
      },
      [
        activeStates,
        dimensionResult,
        regionDimensionResult,
      ],
    );

  const queryElements =
    hasQueryPrerequisites &&
    dimensionError ===
      null
      ? visibleAmms.map(
          (amm) =>
            createElement(
              TeamAmmKpiQueryItem,
              {
                key:
                  `${collectionKey}:${amm.key}`,
                collectionKey,
                cycleKey,
                kpiId,
                amm,
                filters,
                onStateChange:
                  handleStateChange,
              },
            ),
        )
      : null;

  return {
    rows,
    employeeCount,
    isLoading,
    error,
    retry,
    queryElements,
  };
}
