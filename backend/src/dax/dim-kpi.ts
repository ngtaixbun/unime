const dimKpiDax = `
EVALUATE
SELECTCOLUMNS(
    'KPIname',
    "kpiname",
        'KPIname'[KPI],
    "kpi_id",
        'KPIname'[num]
)
`.trim();

export function buildDimKpiDax(): string {
  return dimKpiDax;
}
