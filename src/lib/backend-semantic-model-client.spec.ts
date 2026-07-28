import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executeBackendSemanticModelQuery,
} from "./backend-semantic-model-client";

describe(
  "backend-semantic-model-client",
  () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it(
      "converts backend rows to Fabric-compatible table rows",
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
                  columns: [
                    "successfulCallsMtd",
                    "successfulCallsIssued",
                  ],

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

        expect(fetchMock)
          .toHaveBeenCalledWith(
            "https://unime-backend.onrender.com/api/dax/query",
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
          "[successfulCallsMtd]",
          "[successfulCallsIssued]",
          "[visitMtd]",
          "[visitIssued]",
          "[timeSpendMtd]",
          "[timeSpendIssued]",
          "[osaMtd]",
          "[osaIssued]",
          "[qcMtd]",
          "[qcIssued]",
        ]);

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
        ]);
      },
    );
  },
);