import { useCallback, useState } from "react";

import { getOverviewDataByPeriod } from "../lib";
import type { OverviewData, OverviewPeriod } from "../types";

interface UseOverviewDataResult {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useOverviewData(period: OverviewPeriod): UseOverviewDataResult {
  const [data, setData] = useState<OverviewData | null>(() => getOverviewDataByPeriod(period));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace this mock mapper with a Fabric Semantic Model service once
      // the source model and validated DAX query schema are available.
      setData(getOverviewDataByPeriod(period));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [period]);

  return { data, loading, error, reload };
}
