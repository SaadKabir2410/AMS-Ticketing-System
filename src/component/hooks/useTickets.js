import { useState, useEffect, useCallback } from 'react'
import { DB } from '../../data/DB'

// useTickets — list with search, filter, sort, pagination
export function useTickets(params = {}) {
    const [data, setData] = useState([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await DB.tickets.getAll(params)
            setData(res.data)
            setTotal(res.total)
            setTotalPages(res.totalPages)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [JSON.stringify(params)])

    useEffect(() => { fetch() }, [fetch])

    return { data, total, totalPages, loading, error, refetch: fetch }
}

// useTicket — single ticket by id
export function useTicket(id) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetch = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const res = await DB.tickets.getById(id)
            setData(res)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { fetch() }, [fetch])
    return { data, loading, error, refetch: fetch }
}

// useTicketStats
export function useTicketStats() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        DB.tickets.getStats().then(s => { setStats(s); setLoading(false) })
    }, [])

    return { stats, loading }
}

// useCreateTicket
export function useCreateTicket() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const create = async (payload) => {
        setLoading(true)
        setError(null)
        try {
            const ticket = await DB.tickets.create(payload)
            return ticket
        } catch (e) {
            setError(e.message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { create, loading, error }
}

//  useUpdateTicket 
export function useUpdateTicket() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const update = async (id, payload) => {
        setLoading(true)
        setError(null)
        try {
            const ticket = await DB.tickets.update(id, payload)
            return ticket
        } catch (e) {
            setError(e.message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { update, loading, error }
}

//  useDeleteTicket 
export function useDeleteTicket() {
    const [loading, setLoading] = useState(false)

    const remove = async (id) => {
        setLoading(true)
        try {
            await DB.tickets.delete(id)
            return true
        } catch {
            return false
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}