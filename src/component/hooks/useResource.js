import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContextHook";

export function useResource(apiObject, params) {
  const { user, isAuthLoading } = useAuth();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user) {
      console.warn("[useResource] No user session found, skipping fetch.");
      return;
    }

    if (!apiObject) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await apiObject.getAll(params);
      let nextData = [];
      let nextTotal = 0;
      let nextTotalPages = 0;

      const responseData = res?.result || res;

      if (Array.isArray(responseData)) {
        nextData = responseData;
        nextTotal = responseData.length;
        nextTotalPages = Math.ceil(nextTotal / (params?.perPage || 10));
      } else if (responseData) {
        nextData = responseData.data || responseData.items || [];

        nextTotal =
          responseData.totalCount ??
          responseData.total ??
          responseData.count ??
          responseData.total_count ??
          responseData.totalItems;

        if (nextTotal === undefined) {
          nextTotal =
            nextData.length === (params?.perPage || 10)
              ? (params?.page || 1) * (params?.perPage || 10) + 1
              : nextData.length;
        }

        nextTotalPages =
          responseData.totalPages ??
          Math.ceil(nextTotal / (params?.perPage || 10));
      }

      setData(nextData);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      console.log("[useResource] Data fetch result:", {
        count: nextData.length,
        total: nextTotal,
      });
      setError(null);
    } catch (e) {
      console.error("useResource fetch error:", e);
      console.error("Backend error detail:", e?.response?.data);
      setError(e);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), apiObject, user, isAuthLoading]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, total, totalPages, loading, error, refetch: fetch };
}