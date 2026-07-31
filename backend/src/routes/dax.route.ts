import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { z } from "zod";

import { env } from "../config/env.js";

import {
  buildDimAmmDax,
} from "../dax/dim-amm.js";

import {
  buildDimDateDax,
} from "../dax/dim-date.js";

import {
  buildDimKpiDax,
} from "../dax/dim-kpi.js";

import {
  buildDimRegionDax,
} from "../dax/dim-region.js";

import {
  buildDimSupervisorDax,
} from "../dax/dim-supervisor.js";

import {
  buildOverviewKpiSummaryDax,
  overviewKpiSummaryColumns,
} from "../dax/overview-kpi-summary.js";

import {
  buildOverviewKpiTrendDax,
} from "../dax/overview-kpi-trend.js";

import {
  buildTeamEmployeeKpiDax,
} from "../dax/team-employee-kpi.js";

import {
  isEncodedDimensionValue,
  type EncodedDimensionValue,
} from "../dax/org-filter.js";

import {
  assertPowerBiQueryResultColumns,
  executePowerBiDax,
  executePowerBiDaxTabular,
} from "../services/powerbi-query.js";

const daxRouter = Router();

const encodedDimensionValueSchema =
  z.string().refine(
    (
      value,
    ): value is EncodedDimensionValue =>
      isEncodedDimensionValue(
        value,
      ),
    {
      message:
        "Filter phải có dạng all, number:<value> hoặc string:<value>.",
    },
  );

const cycleKeySchema =
  z.union([
    z.number().finite(),

    z.string()
      .trim()
      .min(
        1,
        "cycleKey đang trống.",
      ),
  ]);

const organizationParamsSchema =
  z.object({
    cycleKey:
      cycleKeySchema,

    region:
      encodedDimensionValueSchema
        .default("all"),

    amm:
      encodedDimensionValueSchema
        .default("all"),

    supervisor:
      encodedDimensionValueSchema
        .default("all"),
  }).strict();

const overviewKpiSummaryParamsSchema =
  organizationParamsSchema
    .extend({
      kpiId:
        z.number()
          .int()
          .positive()
          .default(1),
    })
    .strict();

const teamEmployeeKpiParamsSchema =
  organizationParamsSchema
    .extend({
      kpiId:
        z.number()
          .int()
          .positive(),
    })
    .strict();

const emptyParamsSchema =
  z.object({}).strict();

const expectedColumnSchema =
  z.string()
    .max(
      512,
      "Tên cột vượt quá 512 ký tự.",
    )
    .refine(
      (value) =>
        value.trim() !== "",
      {
        message:
          "Tên cột không được để trống.",
      },
    );

const genericDaxExecuteRequestSchema =
  z.object({
    query:
      z.string()
        .refine(
          (value) =>
            value.trim() !== "",
          {
            message:
              "DAX query không được để trống.",
          },
        ),

    expectedColumns:
      z.array(
        expectedColumnSchema,
      )
        .min(
          1,
          "expectedColumns phải có ít nhất một cột.",
        )
        .max(
          env.DAX_MAX_EXPECTED_COLUMNS,
          `expectedColumns vượt quá giới hạn ${env.DAX_MAX_EXPECTED_COLUMNS} cột.`,
        )
        .refine(
          (columns) =>
            new Set(columns).size ===
            columns.length,
          {
            message:
              "expectedColumns không được có tên cột trùng nhau.",
          },
        ),
  })
    .strict()
    .superRefine(
      (value, context) => {
        const queryBytes =
          Buffer.byteLength(
            value.query,
            "utf8",
          );

        if (
          queryBytes >
          env.DAX_MAX_LENGTH_BYTES
        ) {
          context.addIssue({
            code: "custom",
            path: [
              "query",
            ],
            message:
              `DAX query vượt quá giới hạn ${env.DAX_MAX_LENGTH_BYTES} bytes.`,
          });
        }
      },
    );

const daxQueryRequestSchema =
  z.discriminatedUnion(
    "queryId",
    [
      z.object({
        queryId:
          z.literal(
            "overview-kpi-summary",
          ),

        params:
          overviewKpiSummaryParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "overview-kpi-trend",
          ),

        params:
          organizationParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "team-employee-kpi",
          ),

        params:
          teamEmployeeKpiParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "dim-date",
          ),

        params:
          emptyParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "dim-kpi",
          ),

        params:
          emptyParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "dim-region",
          ),

        params:
          emptyParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "dim-amm",
          ),

        params:
          z.object({
            region:
              encodedDimensionValueSchema
                .default("all"),
          }).strict(),
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "dim-supervisor",
          ),

        params:
          z.object({
            region:
              encodedDimensionValueSchema
                .default("all"),

            amm:
              encodedDimensionValueSchema
                .default("all"),
          }).strict(),
      }).strict(),
    ],
  );

type DaxQueryRequest =
  z.infer<
    typeof daxQueryRequestSchema
  >;

function buildRegisteredDaxQuery(
  request: DaxQueryRequest,
): string {
  switch (request.queryId) {
    case "overview-kpi-summary":
      return buildOverviewKpiSummaryDax({
        cycleKey:
          request.params.cycleKey,

        kpiId:
          request.params.kpiId,

        filters: {
          region:
            request.params.region,

          amm:
            request.params.amm,

          supervisor:
            request.params
              .supervisor,
        },
      });

    case "overview-kpi-trend":
      return buildOverviewKpiTrendDax({
        cycleKey:
          request.params.cycleKey,

        filters: {
          region:
            request.params.region,

          amm:
            request.params.amm,

          supervisor:
            request.params
              .supervisor,
        },
      });

    case "team-employee-kpi":
      return buildTeamEmployeeKpiDax({
        cycleKey:
          request.params.cycleKey,

        kpiId:
          request.params.kpiId,

        filters: {
          region:
            request.params.region,

          amm:
            request.params.amm,

          supervisor:
            request.params
              .supervisor,
        },
      });

    case "dim-date":
      return buildDimDateDax();

    case "dim-kpi":
      return buildDimKpiDax();

    case "dim-region":
      return buildDimRegionDax();

    case "dim-amm":
      return buildDimAmmDax({
        region:
          request.params.region,
      });

    case "dim-supervisor":
      return buildDimSupervisorDax({
        region:
          request.params.region,

        amm:
          request.params.amm,
      });
  }

  const exhaustiveRequest:
    never = request;

  throw new Error(
    `Query ID không được hỗ trợ: ${String(exhaustiveRequest)}`,
  );
}

daxRouter.post(
  "/execute",
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      if (
        !env.enableGenericDax
      ) {
        response.status(404).json({
          success: false,

          error: {
            code:
              "GENERIC_DAX_DISABLED",

            message:
              "Generic DAX endpoint chưa được bật.",
          },
        });

        return;
      }

      const parsed =
        genericDaxExecuteRequestSchema
          .parse(
            request.body,
          );

      const result =
        await executePowerBiDaxTabular(
          parsed.query,
          parsed.expectedColumns,
        );

      response.json({
        success: true,

        data: result,

        meta: {
          rowCount:
            result.rows.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

daxRouter.post(
  "/query",
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed =
        daxQueryRequestSchema.parse(
          request.body,
        );

      const dax =
        buildRegisteredDaxQuery(
          parsed,
        );

      const result =
        await executePowerBiDax(
          dax,
        );

      if (
        parsed.queryId ===
          "overview-kpi-summary"
      ) {
        assertPowerBiQueryResultColumns(
          result,
          overviewKpiSummaryColumns,
        );
      }

      response.json({
        success: true,

        data: result,

        meta: {
          queryId:
            parsed.queryId,

          rowCount:
            result.rows.length,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

export {
  buildRegisteredDaxQuery,
  daxRouter,
  daxQueryRequestSchema,
  genericDaxExecuteRequestSchema,
};
