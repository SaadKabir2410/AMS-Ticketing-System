import apiClient from "../apiClient";

export const sitesApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    columnFilter,
    filterOperator,
  } = {}) => {
    const operatorMap = {
      contains: "Contains",
      equals: "Equals",
      startsWith: "StartsWith",
    };
    const backendOperator = operatorMap[filterOperator] || "Contains";
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
      siteSearchParams = {
        [backendParam]: columnFilter.value,
        [`${backendParam}Operator`]:
          operatorMap[columnFilter.operator] || backendOperator,
      };
    }

    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      FilterOperator: backendOperator,
      ...siteSearchParams,
      Sorting: `${sortFieldMap[sortKey] || "Id"} ${sortDir}`,
    };

    console.log("[DB.sites] getAll:", params);
    return apiClient.get("/api/app/site/paged-list", { params }).then((r) => {
      console.log("[DB.sites] getAll success:", r.data);
      return r.data;
    });
  },
  checkOcnExists: (ocn, signal) => {
    const params = {
      SkipCount: 0,
      MaxResultCount: 1,
      "SiteSearch.OCN": ocn,
      "SiteSearch.OCNOperator": "Equals",
      Sorting: "Name asc",
    };
    console.log("[DB.sites] checking OCN:", ocn);
    return apiClient
      .get("/api/app/site/paged-list", { params, signal })
      .then((r) => r.data);
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
  delete: (id) => {
    console.log("[DB.sites] deleting:", id);
    return apiClient.delete(`/api/app/site/${id}`).then((r) => r.data);
  },
};

export default sitesApi;
