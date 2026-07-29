import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { z } from "zod";

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
} from "../dax/overview-kpi-summary.js";

import {
  buildOverviewKpiTrendDax,
} from "../dax/overview-kpi-trend.js";

import {
  isEncodedDimensionValue,
  type EncodedDimensionValue,
} from "../dax/org-filter.js";

import {
  executePowerBiDax,
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

const emptyParamsSchema =
  z.object({}).strict();

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
};
