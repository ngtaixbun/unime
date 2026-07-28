import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { z } from "zod";

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
          organizationParamsSchema,
      }).strict(),

      z.object({
        queryId:
          z.literal(
            "overview-kpi-trend",
          ),

        params:
          organizationParamsSchema,
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
  const filters = {
    region:
      request.params.region,

    amm:
      request.params.amm,

    supervisor:
      request.params
        .supervisor,
  };

  switch (request.queryId) {
    case "overview-kpi-summary":
      return buildOverviewKpiSummaryDax({
        cycleKey:
          request.params
            .cycleKey,

        filters,
      });

    case "overview-kpi-trend":
      return buildOverviewKpiTrendDax({
        cycleKey:
          request.params
            .cycleKey,

        filters,
      });
  }
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
        daxQueryRequestSchema
          .parse(
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
  daxRouter,
};