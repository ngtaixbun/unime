import type { DimDateCycleValue } from "./dim-date";
import type { OrgQueryFilters } from "./org-filter";
import {
  applySemanticQueryContext,
  replaceDaxPlaceholder,
  toDaxDateLiteral,
} from "./query-context";
import marketDax from "./market.dax?raw";

export type MarketOrganizationLevel = "region" | "amm" | "supervisor";
export type MarketQueryMode =
  | { kind: "summary"; dateScope?: "single-day" | "cycle-to-date" }
  | { kind: "trend" }
  | { kind: "organization"; level: MarketOrganizationLevel }
  | { kind: "gap-shop-details" }
  | { kind: "available-dates" };

export interface BuildMarketQueryParams {
  mode: MarketQueryMode;
  cycleKey?: DimDateCycleValue;
  anchorDate?: string;
  filters?: OrgQueryFilters;
  queryName?: string;
}

interface Descriptor {
  measures: readonly MarketMeasureKey[];
  definitions: string;
  groupBy: string;
  cycleFilter: string;
  dateFilter: string;
  mappingFilter: string;
  result: string;
  orderBy: string;
}

const CATALOG_PATTERN = /\/\* @market-measure-catalog([\s\S]*?)@end-market-measure-catalog \*\//;
const CATALOG_ENTRY_PATTERN = /"([A-Za-z0-9_]+)"\s*,\s*(\[[^\]\r\n]+\])/g;

function parseMeasureCatalog(source: string): ReadonlyMap<string, string> {
  const block = CATALOG_PATTERN.exec(source)?.[1];
  if (block === undefined) {
    throw new Error("market.dax thiếu @market-measure-catalog.");
  }
  const entries = new Map<string, string>();
  for (const match of block.matchAll(CATALOG_ENTRY_PATTERN)) {
    entries.set(match[1], match[2]);
  }
  if (entries.size === 0) {
    throw new Error("@market-measure-catalog đang trống.");
  }
  return entries;
}

const measureCatalog = parseMeasureCatalog(marketDax);
export type MarketMeasureKey =
  | "coverage_emp" | "plan_emp" | "coverage_shop" | "plan_shop"
  | "plan_call" | "coverage_call" | "coverage_call_perc" | "coverage_gap_call"
  | "coverage_shop_perc" | "coverage_emp_perc"
  | "coverage_gap_emp" | "coverage_gap_shop"
  | "discipline_time" | "discipline_failtime"
  | "discipline_citre_perc" | "discipline_cosom_perc"
  | "coverage_dibu_shop" | "coverage_dibu_emp" | "coverage_dibu_call"
  | "coverage_actual_call" | "coverage_actual_shop" | "coverage_actual_emp"
  | "coverage_shop_vs_D1" | "coverage_emp_vs_D1"
  | "KQCH_TC" | "KQCH_KTC" | "KQCH_dongcua"
  | "update_time"
  | "employeeId_assigned" | "employeeName_assigned";

export const marketMeasureCatalog = measureCatalog as ReadonlyMap<MarketMeasureKey, string>;

const SUMMARY_MEASURES: readonly MarketMeasureKey[] = [
  "coverage_emp", "plan_emp", "coverage_shop", "plan_shop",
  "plan_call", "coverage_call", "coverage_call_perc", "coverage_gap_call",
  "coverage_dibu_shop", "coverage_dibu_emp", "coverage_dibu_call",
  "coverage_actual_call", "coverage_actual_shop", "coverage_actual_emp",
  "coverage_shop_perc", "coverage_emp_perc",
  "coverage_gap_emp", "coverage_gap_shop",
  "discipline_time", "discipline_failtime",
  "discipline_citre_perc", "discipline_cosom_perc",
  "coverage_shop_vs_D1", "coverage_emp_vs_D1",
  "KQCH_TC", "KQCH_KTC", "KQCH_dongcua",
  "update_time",
];
const TREND_MEASURES: readonly MarketMeasureKey[] = [
  "coverage_shop_perc", "coverage_emp_perc",
  "coverage_shop_vs_D1", "coverage_emp_vs_D1",
];
const ORGANIZATION_MEASURES: readonly MarketMeasureKey[] = [
  "coverage_shop_perc", "coverage_emp_perc",
  "coverage_gap_shop", "coverage_gap_emp",
  "coverage_shop_vs_D1", "coverage_emp_vs_D1",
];
const AVAILABLE_DATE_MEASURES: readonly MarketMeasureKey[] = [
  "coverage_emp", "coverage_shop",
];
const GAP_SHOP_DETAIL_MEASURES: readonly MarketMeasureKey[] = [
  "coverage_gap_shop",
  "employeeId_assigned",
  "employeeName_assigned",
];

const CYCLE_FILTER = `,
        KEEPFILTERS(
            TREATAS({ _SelectedCycleKey }, 'Date'[Chu kỳ KPI Key])
        )`;
const MAPPING_FILTER = `,
        KEEPFILTERS(
            'dimnv'[mappingStatus] = 1
                || ISBLANK('dimnv'[Region ID])
                || ISBLANK('dimnv'[Region])
                || LEN(TRIM('dimnv'[Region])) = 0
        )`;

function summaryResult(measures: readonly MarketMeasureKey[]): string {
  const projection = measures
    .map((measure) => `    "${measure}", [${measure}]`)
    .join(",\n");
  return `SELECTCOLUMNS(
    _Rows,
${projection}
)`;
}

function anchorLiteral(value: string | undefined, queryName: string): string {
  if (value === undefined) throw new Error(`${queryName} cần anchorDate.`);
  return toDaxDateLiteral(value, "anchorDate", queryName);
}

function summaryDescriptor(
  mode: Extract<MarketQueryMode, { kind: "summary" }>,
  anchorDate: string | undefined,
  queryName: string,
): Descriptor {
  const date = anchorDate === undefined ? null : toDaxDateLiteral(anchorDate, "anchorDate", queryName);
  const dateFilter = date === null
    ? ""
    : mode.dateScope === "cycle-to-date"
      ? `,
        KEEPFILTERS(
            FILTER(
            ALL('Date'[Date]),
                'Date'[Date] <= ${date}
            )
        )`
      : `,
        KEEPFILTERS(TREATAS({ ${date} }, 'Date'[Date]))`;
  return {
    measures: SUMMARY_MEASURES,
    definitions: "VAR _SelectedCycleKey =\n        __SELECTED_CYCLE_KEY__",
    groupBy: "",
    cycleFilter: CYCLE_FILTER,
    dateFilter,
    mappingFilter: MAPPING_FILTER,
    result: summaryResult(SUMMARY_MEASURES),
    orderBy: "",
  };
}

function trendDescriptor(anchorDate: string | undefined, queryName: string): Descriptor {
  const date = anchorLiteral(anchorDate, queryName);
  return {
    measures: TREND_MEASURES,
    definitions: `VAR _SelectedCycleKey = __SELECTED_CYCLE_KEY__

    VAR _AnchorDate = ${date}

    VAR _WindowDates =
        SELECTCOLUMNS(
            FILTER(
                ALL('Date'[Date]),
                'Date'[Date] >= _AnchorDate - 4
                    && 'Date'[Date] <= _AnchorDate
            ),
            "__marketDate", 'Date'[Date]
        )`,
    groupBy: "'Date'[Date],",
    cycleFilter: CYCLE_FILTER,
    dateFilter: ",\n        KEEPFILTERS(TREATAS(_WindowDates, 'Date'[Date]))",
    mappingFilter: MAPPING_FILTER,
    result: `SELECTCOLUMNS(
    _Rows,
    "marketDate", 'Date'[Date],
    "coverageShopPerc", [coverage_shop_perc],
    "coverageEmpPerc", [coverage_emp_perc],
    "coverageShopVsD1", [coverage_shop_vs_D1],
    "coverageEmpVsD1", [coverage_emp_vs_D1]
)`,
    orderBy: "ORDER BY [marketDate] ASC",
  };
}

const ORG = {
  region: {
    groupBy: "'dimnv'[Region ID],\n            'dimnv'[Region],",
    predicate: "NOT ISBLANK([coverage_shop_perc]) || NOT ISBLANK([coverage_emp_perc])",
    projection: `    "entityId", 'dimnv'[Region ID],
    "entityLabel", 'dimnv'[Region],`,
  },
  amm: {
    groupBy: "'dimnv'[amm id],\n            'dimnv'[amm name],",
    predicate: `NOT ISBLANK('dimnv'[amm id])
            && NOT ISBLANK('dimnv'[amm name])
            && (NOT ISBLANK([coverage_shop_perc]) || NOT ISBLANK([coverage_emp_perc]))`,
    projection: `    "entityId", 'dimnv'[amm id],
    "entityLabel", 'dimnv'[amm name],`,
  },
  supervisor: {
    groupBy: "'dimnv'[Sup Clean ID],\n            'dimnv'[Sup Clean],\n            'dimnv'[Region],\n            'dimnv'[amm name],",
    predicate: `NOT ISBLANK('dimnv'[Sup Clean ID])
            && NOT ISBLANK('dimnv'[Sup Clean])
            && (NOT ISBLANK([coverage_shop_perc]) || NOT ISBLANK([coverage_emp_perc]))`,
    projection: `    "entityId", 'dimnv'[Sup Clean ID],
    "entityLabel", 'dimnv'[Sup Clean],
    "regionLabel", 'dimnv'[Region],
    "ammLabel", 'dimnv'[amm name],`,
  },
} as const;

function organizationDescriptor(
  level: MarketOrganizationLevel,
  anchorDate: string | undefined,
  queryName: string,
): Descriptor {
  const date = anchorLiteral(anchorDate, queryName);
  const org = ORG[level];
  return {
    measures: ORGANIZATION_MEASURES,
    definitions: `VAR _SelectedCycleKey = __SELECTED_CYCLE_KEY__
    VAR _AnchorDate = ${date}
    VAR _MtdDates =
        SELECTCOLUMNS(
            FILTER(ALL('Date'[Date]), 'Date'[Date] <= _AnchorDate),
            "__marketDate", 'Date'[Date]
        )`,
    groupBy: org.groupBy,
    cycleFilter: CYCLE_FILTER,
    dateFilter: ",\n        KEEPFILTERS(TREATAS(_MtdDates, 'Date'[Date]))",
    mappingFilter: MAPPING_FILTER,
    result: `SELECTCOLUMNS(
    FILTER(
        _Rows,
        ${org.predicate}
    ),
    "marketDate", _AnchorDate,
${org.projection}
    "coverageShopPerc", [coverage_shop_perc],
    "coverageEmpPerc", [coverage_emp_perc],
    "coverageGapShop", [coverage_gap_shop],
    "coverageGapEmp", [coverage_gap_emp],
    "coverageShopVsD1", [coverage_shop_vs_D1],
    "coverageEmpVsD1", [coverage_emp_vs_D1]
)`,
    orderBy: "ORDER BY [entityLabel] ASC, [entityId] ASC",
  };
}

function gapShopDetailsDescriptor(
  anchorDate: string | undefined,
  queryName: string,
): Descriptor {
  const date = anchorLiteral(anchorDate, queryName);
  return {
    measures: GAP_SHOP_DETAIL_MEASURES,
    definitions: `VAR _SelectedCycleKey = __SELECTED_CYCLE_KEY__
    VAR _SelectedDate = ${date}`,
    groupBy: `'dimstore'[ShopId],
            'dimstore'[ShopName],
            'dimstore'[SupplierId],
            'dimstore'[SupplierName],`,
    cycleFilter: CYCLE_FILTER,
    dateFilter: `,
        KEEPFILTERS(
            TREATAS(
                { _SelectedDate },
                'Date'[Date]
            )
        )`,
    mappingFilter: MAPPING_FILTER,
    result: `VAR _GapShopRows =
    FILTER(
        _Rows,
        [coverage_gap_shop] = 1
            && NOT ISBLANK('dimstore'[ShopId])
            && NOT ISBLANK('dimstore'[ShopName])
    )

VAR _EnrichedRows =
    GENERATEALL(
        _GapShopRows,
        VAR _EmployeeId = [employeeId_assigned]
        RETURN
            CALCULATETABLE(
                SELECTCOLUMNS(
                    SUMMARIZE(
                        'dimnv',
                        'dimnv'[Employee_Id],
                        'dimnv'[Region ID],
                        'dimnv'[Region],
                        'dimnv'[Sup Clean ID],
                        'dimnv'[Sup Clean]
                    ),
                    "regionId", 'dimnv'[Region ID],
                    "regionName", 'dimnv'[Region],
                    "supervisorId", 'dimnv'[Sup Clean ID],
                    "supervisorName", 'dimnv'[Sup Clean]
                ),
                REMOVEFILTERS('dimnv'),
                TREATAS(
                    { _EmployeeId },
                    'dimnv'[Employee_Id]
                ),
                KEEPFILTERS(
                    'dimnv'[mappingStatus] = 1
                )
            )
    )

RETURN
SELECTCOLUMNS(
    _EnrichedRows,
    "shopId", 'dimstore'[ShopId],
    "shopName", 'dimstore'[ShopName],
    "nppId", 'dimstore'[SupplierId],
    "nppName", 'dimstore'[SupplierName],
    "coverageGapShop", [coverage_gap_shop],
    "employeeIdAssigned", [employeeId_assigned],
    "employeeNameAssigned", [employeeName_assigned],
    "regionId", [regionId],
    "regionName", [regionName],
    "supervisorId", [supervisorId],
    "supervisorName", [supervisorName]
)`,
    orderBy: `ORDER BY
    [regionName] ASC,
    [shopName] ASC,
    [shopId] ASC`,
  };
}

function availableDatesDescriptor(): Descriptor {
  return {
    measures: AVAILABLE_DATE_MEASURES,
    definitions: "VAR _MarketDatesMode = 1",
    groupBy: "'Date'[Date],",
    cycleFilter: "",
    dateFilter: "",
    mappingFilter: "",
    result: `SELECTCOLUMNS(
    FILTER(
        _Rows,
        NOT ISBLANK([coverage_emp]) || NOT ISBLANK([coverage_shop])
    ),
    "marketDate", 'Date'[Date]
)`,
    orderBy: "ORDER BY [marketDate] DESC",
  };
}

export const marketQueryTemplate = marketDax.trim();
const executableMarketQueryTemplate = marketQueryTemplate
  .replace(CATALOG_PATTERN, "")
  .trim();

function buildMeasureExpressions(keys: readonly MarketMeasureKey[]): string {
  return keys.map((key) => {
    const expression = marketMeasureCatalog.get(key);
    if (expression === undefined) {
      throw new Error(`market.dax thiếu measure ${key}.`);
    }
    return `"${key}", ${expression}`;
  }).join(",\n            ");
}

export function buildMarketQuery({
  mode,
  cycleKey,
  anchorDate,
  filters = {},
  queryName = `market:${mode.kind}`,
}: BuildMarketQueryParams): string {
  if (mode.kind !== "available-dates" && cycleKey === undefined) {
    throw new Error(`${queryName} cần cycleKey.`);
  }
  const descriptor = mode.kind === "summary"
    ? summaryDescriptor(mode, anchorDate, queryName)
    : mode.kind === "trend"
      ? trendDescriptor(anchorDate, queryName)
      : mode.kind === "organization"
        ? organizationDescriptor(mode.level, anchorDate, queryName)
        : mode.kind === "gap-shop-details"
          ? gapShopDetailsDescriptor(anchorDate, queryName)
          : availableDatesDescriptor();
  const replacements: Record<string, string> = {
    __MODE_DEFINITIONS__: descriptor.definitions,
    __GROUP_BY_COLUMNS__: descriptor.groupBy,
    __MEASURE_EXPRESSIONS__: buildMeasureExpressions(descriptor.measures),
    __CYCLE_FILTER__: descriptor.cycleFilter,
    __DATE_FILTER__: descriptor.dateFilter,
    __MAPPING_FILTER__: descriptor.mappingFilter,
    __RESULT_EXPRESSION__: descriptor.result,
    __ORDER_BY__: descriptor.orderBy,
  };
  let query = executableMarketQueryTemplate;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    query = replaceDaxPlaceholder(query, placeholder, replacement, queryName);
  }
  return applySemanticQueryContext(query, { cycleKey, filters }, queryName);
}
