import {
  buildTreatasFilter,
  type EncodedDimensionValue,
} from "./org-filter.js";

export interface DimAmmParams {
  region?: EncodedDimensionValue;
}

const dimAmmTemplate = `
DEFINE
    VAR _Rows =
        CALCULATETABLE(
            DISTINCT(
                SELECTCOLUMNS(
                    'dimnv',

                    "ammId",
                        'dimnv'[amm_id],

                    "ammLabel",
                        'dimnv'[amm_name],

                    "regionId",
                        'dimnv'[Region ID]
                )
            )

            __REGION_FILTER__
        )

EVALUATE
FILTER(
    _Rows,

    NOT ISBLANK([ammId])
        && NOT ISBLANK([ammLabel])
        && NOT ISBLANK([regionId])
)

ORDER BY
    [ammLabel] ASC,
    [ammId] ASC
`.trim();

export function buildDimAmmDax({
  region = "all",
}: DimAmmParams = {}): string {
  if (
    !dimAmmTemplate.includes(
      "__REGION_FILTER__",
    )
  ) {
    throw new Error(
      "Template dim-amm thiếu REGION filter.",
    );
  }

  const query =
    dimAmmTemplate.replace(
      "__REGION_FILTER__",
      buildTreatasFilter(
        region,
        "'dimnv'[Region ID]",
      ),
    );

  if (
    query.includes(
      "__REGION_FILTER__",
    )
  ) {
    throw new Error(
      "Không thể áp dụng Region vào dim-amm.",
    );
  }

  return query;
}