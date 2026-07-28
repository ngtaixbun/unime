import {
  buildTreatasFilter,
  type EncodedDimensionValue,
} from "./org-filter.js";

export interface DimSupervisorParams {
  region?: EncodedDimensionValue;
  amm?: EncodedDimensionValue;
}

const dimSupervisorTemplate = `
DEFINE
    VAR _Rows =
        CALCULATETABLE(
            DISTINCT(
                SELECTCOLUMNS(
                    'dimnv',

                    "supervisorId",
                        'dimnv'[sup_id],

                    "supervisorLabel",
                        'dimnv'[sup_name],

                    "ammId",
                        'dimnv'[amm_id],

                    "regionId",
                        'dimnv'[Region ID]
                )
            )

            __REGION_FILTER__
            __AMM_FILTER__
        )

EVALUATE
FILTER(
    _Rows,

    NOT ISBLANK([supervisorId])
        && NOT ISBLANK([supervisorLabel])
        && NOT ISBLANK([ammId])
        && NOT ISBLANK([regionId])
)

ORDER BY
    [regionId] ASC,
    [ammId] ASC,
    [supervisorLabel] ASC,
    [supervisorId] ASC
`.trim();

export function buildDimSupervisorDax({
  region = "all",
  amm = "all",
}: DimSupervisorParams = {}): string {
  for (
    const placeholder of [
      "__REGION_FILTER__",
      "__AMM_FILTER__",
    ]
  ) {
    if (
      !dimSupervisorTemplate.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template dim-supervisor thiếu ${placeholder}.`,
      );
    }
  }

  const query =
    dimSupervisorTemplate
      .replace(
        "__REGION_FILTER__",
        buildTreatasFilter(
          region,
          "'dimnv'[Region ID]",
        ),
      )
      .replace(
        "__AMM_FILTER__",
        buildTreatasFilter(
          amm,
          "'dimnv'[amm_id]",
        ),
      );

  if (
    query.includes(
      "__REGION_FILTER__",
    ) ||
    query.includes(
      "__AMM_FILTER__",
    )
  ) {
    throw new Error(
      "Không thể áp dụng filter vào dim-supervisor.",
    );
  }

  return query;
}