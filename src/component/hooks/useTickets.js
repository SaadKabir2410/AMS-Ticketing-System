import { useState, useEffect, useCallback } from "react";
import { ticketsApi } from "../../services/api/tickets";
import { useAuth } from "../../context/AuthContextHook";

// useTickets — list with search, filter, sort, pagination
export function useTickets(params = {}) {
  const auth = useAuth();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ticketsApi.getAll(params);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, total, totalPages, loading, error, refetch: fetch };
}

// useTicket — single ticket by id
export function useTicket(id) {
  const auth = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return;
    }
    setLoading(true);
    try {
      const res = await ticketsApi.getById(id);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// useTicketStats
export function useTicketStats() {
  const auth = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.isAuthenticated) {
      ticketsApi.getStats().then((s) => {
        setStats(s);
        setLoading(false);
      });
    }
  }, [auth.isAuthenticated]);

  return { stats, loading };
}

// useCreateTicket
export function useCreateTicket() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (payload) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const ticket = await ticketsApi.create(payload);
      return ticket;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

// useUpdateTicket
export function useUpdateTicket() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (id, payload) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const ticket = await ticketsApi.update(id, payload);
      return ticket;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}

// useDeleteTicket
export function useDeleteTicket() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const remove = async (id) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return false;
    }
    setLoading(true);
    try {
      await ticketsApi.delete(id);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
}
