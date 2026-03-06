import { useState, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";

export function useResource(apiObject, params) {
  const auth = useAuth();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!auth.isAuthenticated) {
      console.warn(
        "[useResource] Not authenticated, skipping fetch and redirecting...",
      );
      auth.signinRedirect();
      return;
    }

    setLoading(true);
    try {
      const res = await apiObject.getAll(params);
      let nextData = [];
      let nextTotal = 0;
      let nextTotalPages = 0;

      // Normalize response (handle wrapping like { result: { items: [], totalCount: 0 } })
      const responseData = res?.result || res;

      if (Array.isArray(responseData)) {
        nextData = responseData;
        nextTotal = responseData.length;
        nextTotalPages = Math.ceil(nextTotal / (params?.perPage || 10));
      } else if (responseData) {
        nextData = responseData.data || responseData.items || [];
        // More aggressive total count detection
        nextTotal =
          responseData.totalCount ??
          responseData.total ??
          responseData.count ??
          responseData.total_count ??
          responseData.totalItems;

        if (nextTotal === undefined) {
          // Fallback: If we got a full page of data, assume there might be a next page
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
      setError(null); // clear any previous error
    } catch (e) {
      console.error("useResource fetch error:", e);
      setError(e);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), apiObject]);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, total, totalPages, loading, error, refetch: fetch };
}
