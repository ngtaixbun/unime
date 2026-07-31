import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executeBackendSemanticModelQuery,
  executeGenericBackendSemanticModelQuery,
} from "./backend-semantic-model-client";

describe(
  "backend-semantic-model-client",
  () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it(
      "converts a generic row-major response without a query registry",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  columns: [
                    "[newKpi]",
                    "[newTarget]",
                  ],

                  rows: [
                    [
                      0.87,
                      0.9,
                    ],
                  ],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        const result =
          await executeGenericBackendSemanticModelQuery({
            query:
              "EVALUATE ROW(\"newKpi\", 0.87, \"newTarget\", 0.9)",

            expectedColumns: [
              "[newKpi]",
              "[newTarget]",
            ],
          });

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "/api/dax/execute",
            expect.objectContaining({
              method: "POST",

              body:
                JSON.stringify({
                  query:
                    "EVALUATE ROW(\"newKpi\", 0.87, \"newTarget\", 0.9)",

                  expectedColumns: [
                    "[newKpi]",
                    "[newTarget]",
                  ],
                }),
            }),
          );

        expect(result)
          .toMatchObject({
            status: "success",

            table: {
              columns: [
                {
                  name:
                    "[newKpi]",
                },
                {
                  name:
                    "[newTarget]",
                },
              ],

              rows: [
                [
                  0.87,
                  0.9,
                ],
              ],
            },
          });
      },
    );

    it(
      "keeps the declared generic schema when the result has no rows",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  columns: [
                    "[newKpi]",
                  ],

                  rows: [],
                },
              }),
          }),
        );

        const result =
          await executeGenericBackendSemanticModelQuery({
            query:
              "EVALUATE FILTER(ROW(\"newKpi\", 1), FALSE())",

            expectedColumns: [
              "[newKpi]",
            ],
          });

        expect(result)
          .toMatchObject({
            status: "success",

            table: {
              columns: [
                {
                  name:
                    "[newKpi]",
                },
              ],

              rows: [],
            },
          });
      },
    );

    it(
      "rejects a generic response whose columns drift from columnMetadata",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  columns: [
                    "[unexpected]",
                  ],

                  rows: [
                    [
                      1,
                    ],
                  ],
                },
              }),
          }),
        );

        await expect(
          executeGenericBackendSemanticModelQuery({
            query:
              "EVALUATE ROW(\"newKpi\", 1)",

            expectedColumns: [
              "[newKpi]",
            ],
          }),
        ).rejects.toThrow(
          "không khớp columnMetadata",
        );
      },
    );

    it(
      "rejects malformed generic row widths",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  columns: [
                    "[first]",
                    "[second]",
                  ],

                  rows: [
                    [
                      1,
                    ],
                  ],
                },
              }),
          }),
        );

        await expect(
          executeGenericBackendSemanticModelQuery({
            query:
              "EVALUATE ROW(\"first\", 1, \"second\", 2)",

            expectedColumns: [
              "[first]",
              "[second]",
            ],
          }),
        ).rejects.toThrow(
          "rows hợp lệ",
        );
      },
    );

    it(
      "converts KPI summary rows to Fabric-compatible rows",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com/",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  rows: [
                    {
                      successfulCallsMtd:
                        null,

                      successfulCallsIssued:
                        0,

                      visitMtd: 91,
                      visitIssued: 2,
                      timeSpendMtd: 92,
                      timeSpendIssued: 3,
                      osaMtd: 93,
                      osaIssued: 4,
                      qcMtd: 94,
                      qcIssued: 5,
                      mtdKpiSelected:
                        0.993,
                      gap:
                        0.193,
                      nvFail:
                        3,
                      contributionNvFail:
                        0.08,
                      countNv:
                        38,
                      contributionNv:
                        0.21,

                      actual:
                        81.6,

                      target:
                        100,
                    },
                  ],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        const result =
          await executeBackendSemanticModelQuery({
            queryId:
              "overview-kpi-summary",

            params: {
              cycleKey: 202608,
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          });

        expect(result.status)
          .toBe("success");

        if (
          result.status !==
          "success"
        ) {
          throw new Error(
            "Expected success result.",
          );
        }

        expect(
          result.table.rows[0],
        ).toEqual([
          null,
          0,
          91,
          2,
          92,
          3,
          93,
          4,
          94,
          5,
          0.993,
          0.193,
          3,
          0.08,
          38,
          0.21,
          81.6,
          100,
        ]);
      },
    );

    it(
      "uses the team-employee-kpi request and exact eight-column contract",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  rows: [
                    {
                      employeeId:
                        101,
                      employeeLabel:
                        "Nguyễn Văn A",
                      regionId:
                        7,
                      ammId:
                        "AMM-01",
                      supervisorId:
                        16365,
                      actual:
                        81.6,
                      target:
                        100,
                      percentage:
                        0.816,
                    },
                  ],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        const result =
          await executeBackendSemanticModelQuery({
            queryId:
              "team-employee-kpi",

            params: {
              cycleKey: 202608,
              kpiId: 4,
              region: "number:7",
              amm: "string:AMM-01",
              supervisor:
                "number:16365",
            },
          });

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "/api/dax/query",
            expect.objectContaining({
              body:
                JSON.stringify({
                  queryId:
                    "team-employee-kpi",

                  params: {
                    cycleKey:
                      202608,
                    kpiId:
                      4,
                    region:
                      "number:7",
                    amm:
                      "string:AMM-01",
                    supervisor:
                      "number:16365",
                  },
                }),
            }),
          );

        expect(result.status)
          .toBe("success");

        if (
          result.status !==
          "success"
        ) {
          throw new Error(
            "Expected success result.",
          );
        }

        expect(
          result.table.columns.map(
            (column) =>
              column.name,
          ),
        ).toEqual([
          "[employeeId]",
          "[employeeLabel]",
          "[regionId]",
          "[ammId]",
          "[supervisorId]",
          "[actual]",
          "[target]",
          "[percentage]",
        ]);

        expect(
          result.table.rows,
        ).toEqual([
          [
            101,
            "Nguyễn Văn A",
            7,
            "AMM-01",
            16365,
            81.6,
            100,
            0.816,
          ],
        ]);
      },
    );

    it(
      "converts dim-date rows to the existing six-column contract",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  rows: [
                    {
                      cycleKey:
                        202608,

                      cycleLabel:
                        "Tháng 08",

                      cycleStartDate:
                        "2026-07-21T00:00:00",

                      cycleEndDate:
                        "2026-07-23T00:00:00",

                      cycleSort:
                        202608,

                      isLatestCycle:
                        true,
                    },
                  ],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        const result =
          await executeBackendSemanticModelQuery({
            queryId:
              "dim-date",

            params: {},
          });

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "/api/dax/query",
            expect.objectContaining({
              method: "POST",
            }),
          );

        expect(result.status)
          .toBe("success");

        if (
          result.status !==
          "success"
        ) {
          throw new Error(
            "Expected success result.",
          );
        }

        expect(
          result.table.columns.map(
            (column) =>
              column.name,
          ),
        ).toEqual([
          "[cycleKey]",
          "[cycleLabel]",
          "[cycleStartDate]",
          "[cycleEndDate]",
          "[cycleSort]",
          "[isLatestCycle]",
        ]);

        expect(
          result.table.rows[0],
        ).toEqual([
          202608,
          "Tháng 08",
          "2026-07-21T00:00:00",
          "2026-07-23T00:00:00",
          202608,
          true,
        ]);
      },
    );

    it(
      "uses the dim-kpi request and expected column contract",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  rows: [
                    {
                      kpiname:
                        "Successful Calls",

                      kpi_id: 1,
                    },
                  ],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        const result =
          await executeBackendSemanticModelQuery({
            queryId:
              "dim-kpi",

            params: {},
          });

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "/api/dax/query",
            expect.objectContaining({
              body:
                JSON.stringify({
                  queryId:
                    "dim-kpi",

                  params: {},
                }),
            }),
          );

        expect(result.status)
          .toBe("success");

        if (
          result.status !==
          "success"
        ) {
          throw new Error(
            "Expected success result.",
          );
        }

        expect(
          result.table.columns.map(
            (column) =>
              column.name,
          ),
        ).toEqual([
          "[kpiname]",
          "[kpi_id]",
        ]);

        expect(
          result.table.rows,
        ).toEqual([
          [
            "Successful Calls",
            1,
          ],
        ]);
      },
    );

    it(
      "uses cascade filter parameters for dimension requests",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const fetchMock =
          vi.fn().mockResolvedValue({
            ok: true,
            status: 200,

            json:
              async () => ({
                success: true,

                data: {
                  rows: [],
                },
              }),
          });

        vi.stubGlobal(
          "fetch",
          fetchMock,
        );

        await executeBackendSemanticModelQuery({
          queryId:
            "dim-supervisor",

          params: {
            region: "number:1",
            amm: "string:001",
          },
        });

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "/api/dax/query",
            expect.objectContaining({
              body:
                JSON.stringify({
                  queryId:
                    "dim-supervisor",

                  params: {
                    region:
                      "number:1",

                    amm:
                      "string:001",
                  },
                }),
            }),
          );
      },
    );

    it(
      "turns a browser network or CORS rejection into an actionable error",
      async () => {
        vi.stubEnv(
          "VITE_API_BASE_URL",
          "https://unime-backend.onrender.com",
        );

        const cause =
          new TypeError(
            "Failed to fetch",
          );

        vi.stubGlobal(
          "fetch",
          vi.fn().mockRejectedValue(
            cause,
          ),
        );

        await expect(
          executeBackendSemanticModelQuery({
            queryId:
              "dim-date",

            params: {},
          }),
        ).rejects.toMatchObject({
          message:
            expect.stringContaining(
              "CORS_ORIGINS",
            ),

          cause,
        });
      },
    );
  },
);
