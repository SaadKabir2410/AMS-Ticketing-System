import apiClient from "../apiClient";

export const sitesApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    columnFilter,
    advancedFilters,
  } = {}) => {
    const sortFieldMap = {
      id: "Id",
      name: "Name",
      ocn: "OCN",
      countryName: "Country.Name",
      address: "Address",
    };
    const columnFilterParamMap = {
      name: "SiteSearch.Name",
      ocn: "SiteSearch.OCN",
      countryName: "SiteSearch.CountryName",
      address: "SiteSearch.Address",
    };

    let siteSearchParams = {};
    if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
      const backendParam = columnFilterParamMap[columnFilter.field];
      siteSearchParams = { [backendParam]: columnFilter.value };
    }

    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      ...siteSearchParams,
      "SiteSearch.Name": advancedFilters?.name || siteSearchParams["SiteSearch.Name"],
      "SiteSearch.OCN": advancedFilters?.ocn || siteSearchParams["SiteSearch.OCN"],
      "SiteSearch.CountryName": advancedFilters?.countryName || siteSearchParams["SiteSearch.CountryName"],
      "SiteSearch.Address": advancedFilters?.address || siteSearchParams["SiteSearch.Address"],
      Sorting: `${sortFieldMap[sortKey] || "Id"} ${sortDir}`,
    };

    console.log("[DB.sites] getAll:", params);
    return apiClient.get("/api/app/site/paged-list", { params }).then((r) => {
      console.log("[DB.sites] getAll success:", r.data);
      return r.data;
    });
  },
  getById: (id) =>
    apiClient.get(`/api/app/site/${id}/by-id`).then((r) => r.data),
  create: (data) => {
    console.log("[DB.sites] creating:", data);
    return apiClient.post("/api/app/site", data).then((r) => r.data);
  },
  update: (id, data) => {
    console.log("[DB.sites] updating:", id, data);
    return apiClient.put(`/api/app/site/${id}`, data).then((r) => r.data);
  },
};

export default sitesApi;
