import { useState, useEffect, useCallback } from "react";


export function useResource(apiObject, params) {
    const [data, setData] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [totalPages, setTotalPages] = useState(0)

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiObject.getAll(params);
            setData(res.data)
            setTotal(res.total)
            setTotalPages(res.totalPages)
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(params), apiObject]);
    useEffect(() => { fetch() }, [fetch]);
    return { data, total, totalPages, loading, refetch: fetch };
}

