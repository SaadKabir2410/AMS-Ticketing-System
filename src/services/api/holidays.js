import apiClient from "../apiClient";

let _cache = null,
  _cacheTs = 0,
  _inflight = null;
const TTL = 60000;

const getSource = () => {
  const now = Date.now();
  if (_cache && now - _cacheTs < TTL) {
    console.log("[DB.holidays] Cache HIT");
    return Promise.resolve(_cache);
  }
  if (_inflight) {
    console.log("[DB.holidays] Sharing inflight request");
    return _inflight;
  }
  console.log("[DB.holidays] Fetching from backend: GET /api/app/holiday");
  return (_inflight = apiClient
    .get("/api/app/holiday")
    .then((r) => {
      _cache = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      _cacheTs = Date.now();
      _inflight = null;
      console.log(
        `[DB.holidays] Fetch complete. Found ${_cache.length} records.`,
      );
      return _cache;
    })
    .catch((err) => {
      _inflight = null;
      console.error("[DB.holidays] Fetch FAILED:", err);
      throw err;
    }));
};

const match = (field, query) =>
  !query ||
  String(field ?? "")
    .toLowerCase()
    .includes(String(query).toLowerCase());

export const holidaysApi = {
  getAll: ({
    search,
    Name,
    Description,
    Type,
    Date: filterDate,
    Year,
    CountryName,
    Locations,
  } = {}) =>
    getSource().then((raw) => {
      const result = raw.filter((h) => {
        if (
          search &&
          !Object.values(h).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
        )
          return false;
        if (
          !match(h.name, Name) ||
          !match(h.description, Description) ||
          !match(h.type, Type) ||
          !match(h.countryName, CountryName) ||
          !match(h.locations, Locations)
        )
          return false;
        if (filterDate && !String(h.date ?? "").startsWith(filterDate))
          return false;
        if (Year && String(h.year) !== String(Year)) return false;
        return true;
      });
      return { items: result, totalCount: result.length };
    }),

  create: (data) =>
    apiClient.post("/api/app/holiday", data).then((r) => {
      _cache = null; // Clear cache
      return r.data;
    }),

  update: (id, data) =>
    apiClient.put(`/api/app/holiday/${id}`, data).then((r) => {
      _cache = null; // Clear cache
      return r.data;
    }),

  delete: (id) =>
    apiClient.delete(`/api/app/holiday/${id}`).then((r) => {
      _cache = null; // Clear cache
      return r.data;
    }),
};

export default holidaysApi;
