import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  encodeDimensionValue,
  dimAmm,
  dimRegion,
  dimSup,
} from "@/queries";
import type {
  FilterOption,
  OverviewFilters,
} from "../types";

const ALL_REGION_OPTION: FilterOption = {
  label: "Tất cả khu vực",
  value: "all",
};

const ALL_AMM_OPTION: FilterOption = {
  label: "Tất cả AMM",
  value: "all",
};

const ALL_SUPERVISOR_OPTION:
  FilterOption = {
    label: "Tất cả Supervisor",
    value: "all",
  };

export interface UseOverviewFilterOptionsResult {
  regionOptions: FilterOption[];
  ammOptions: FilterOption[];
  supervisorOptions: FilterOption[];

  isLoadingRegionOptions: boolean;
  isLoadingAmmOptions: boolean;
  isLoadingSupervisorOptions: boolean;

  regionOptionsError: string | null;
  ammOptionsError: string | null;
  supervisorOptionsError: string | null;
}

function getErrorMessage(
  hookError: Error | undefined,
  data:
    | {
        status: "error";
        error: {
          message: string;
        };
      }
    | {
        status: "success";
      }
    | undefined,
): string | null {
  if (hookError) {
    return hookError.message;
  }

  if (data?.status === "error") {
    return data.error.message;
  }

  return null;
}

function buildOptions(
  data:
    | {
        status: "success";
        table: {
          columns: Array<{
            name: string;
          }>;
          rows: unknown[][];
        };
      }
    | {
        status: "error";
      }
    | undefined,
  idColumnName: string,
  labelColumnName: string,
  allOption: FilterOption,
): FilterOption[] {
  if (data?.status !== "success") {
    return [allOption];
  }

  const idColumnIndex =
    data.table.columns.findIndex(
      (column) =>
        column.name === idColumnName,
    );

  const labelColumnIndex =
    data.table.columns.findIndex(
      (column) =>
        column.name === labelColumnName,
    );

  if (
    idColumnIndex === -1 ||
    labelColumnIndex === -1
  ) {
    return [allOption];
  }

  const seen = new Set<string>();
  const options = [allOption];

  for (const row of data.table.rows) {
    const rawId = row[idColumnIndex];
    const rawLabel =
      row[labelColumnIndex];

    if (
      (
        typeof rawId !== "string" &&
        typeof rawId !== "number"
      ) ||
      rawLabel === null ||
      rawLabel === undefined
    ) {
      continue;
    }

    const label =
      String(rawLabel).trim();

    if (label === "") {
      continue;
    }

    const value =
      encodeDimensionValue(rawId);

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    options.push({
      label,
      value,
    });
  }

  return options;
}

export function useOverviewFilterOptions(
  draftFilters: OverviewFilters,
): UseOverviewFilterOptionsResult {
  const regionConfig = dimRegion();
  const ammConfig = dimAmm({
    region:
      draftFilters.region === "all"
        ? "all"
        : draftFilters.region,
  });
  const supervisorConfig = dimSup({
    region:
      draftFilters.region === "all"
        ? "all"
        : draftFilters.region,
    amm:
      draftFilters.amm === "all"
        ? "all"
        : draftFilters.amm,
  });

  const regionResult =
    useSemanticModelQuery({
      connection:
        regionConfig.connection,
      query: regionConfig.query,
    });

  const ammResult =
    useSemanticModelQuery({
      connection:
        ammConfig.connection,
      query: ammConfig.query,
    });

  const supervisorResult =
    useSemanticModelQuery({
      connection:
        supervisorConfig.connection,
      query:
        supervisorConfig.query,
    });

  return {
    regionOptions: buildOptions(
      regionResult.data,
      "[regionId]",
      "[regionLabel]",
      ALL_REGION_OPTION,
    ),

    ammOptions: buildOptions(
      ammResult.data,
      "[ammId]",
      "[ammLabel]",
      ALL_AMM_OPTION,
    ),

    supervisorOptions: buildOptions(
      supervisorResult.data,
      "[supervisorId]",
      "[supervisorLabel]",
      ALL_SUPERVISOR_OPTION,
    ),

    isLoadingRegionOptions:
      regionResult.isLoading,
    isLoadingAmmOptions:
      ammResult.isLoading,
    isLoadingSupervisorOptions:
      supervisorResult.isLoading,

    regionOptionsError:
      getErrorMessage(
        regionResult.error,
        regionResult.data,
      ),

    ammOptionsError:
      getErrorMessage(
        ammResult.error,
        ammResult.data,
      ),

    supervisorOptionsError:
      getErrorMessage(
        supervisorResult.error,
        supervisorResult.data,
      ),
  };
}
