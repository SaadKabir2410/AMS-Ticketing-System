import apiClient from "../apiClient";

const SettingsService = {
  getEmailSettings: () => {
    return apiClient.get("/api/setting-management/emailing").then((r) => r.data);
  },

  updateEmailSettings: (settings) => {
    const payload = {
      smtpHost: settings.host,
      smtpPort: Number(settings.port),
      smtpUserName: settings.username ?? null,
      // Only send password if user typed a new one, otherwise send null
      smtpPassword: settings.password || null,
      smtpDomain: settings.domain ?? "",
      smtpEnableSsl: settings.enableSsl,
      smtpUseDefaultCredentials: settings.useDefaultCredentials,
      defaultFromAddress: settings.defaultFromAddress,
      defaultFromDisplayName: settings.defaultFromDisplayName,
    };
    return apiClient.post("/api/setting-management/emailing", payload).then((r) => r.data);
  },

  sendTestEmail: (settings) => {
    const payload = {
      senderEmailAddress: settings.defaultFromAddress,
      targetEmailAddress: settings.defaultFromAddress,
      subject: "Test Email",
      body: "This is a test email sent from the settings page.",
    };
    return apiClient
      .post("/api/setting-management/emailing/send-test-email", payload)
      .then((r) => r.data);
  },

  // Fetch all system settings in parallel
  getSystemSettings: async () => {
    const keys = {
      workingHoursFrom: "Billing.WorkingHoursFrom",
      workingHoursTo: "Billing.WorkingHoursTo",
      baseNumberOfTicketsForAfterOfficeHours: "Billing.BaseNumberOfTicketsForAfterOfficeHours",
      jobsheetCanBeModifiedUpToDays: "Billing.EditableJobsheetDays",
      specificTicketsCommissionPercentage: "Billing.AMSTicketCommissionPercentage",
    };

    const entries = await Promise.all(
      Object.entries(keys).map(async ([field, name]) => {
        const value = await apiClient
          .get("/api/app/setting", { params: { name } })
          .then((r) => r.data);
        return [field, value ?? ""];
      })
    );

    return Object.fromEntries(entries);
  },

  // Save all system settings as query params
  updateSystemSettings: async (settings) => {
    const map = {
      workingHoursFrom: "Billing.WorkingHoursFrom",
      workingHoursTo: "Billing.WorkingHoursTo",
      baseNumberOfTicketsForAfterOfficeHours: "Billing.BaseNumberOfTicketsForAfterOfficeHours",
      jobsheetCanBeModifiedUpToDays: "Billing.EditableJobsheetDays",
      specificTicketsCommissionPercentage: "Billing.AMSTicketCommissionPercentage",
    };

    await Promise.all(
      Object.entries(map).map(([field, name]) =>
        apiClient
          .post("/api/app/setting/set", null, {
            params: { name, value: String(settings[field]) },
          })
          .then((r) => r.data)
      )
    );
  },

  // Fetch host features
  getFeatures: () => {
    return apiClient
      .get("/api/feature-management/features", { params: { providerName: "T" } })
      .then((r) => r.data);
  },

  // Save updated features
  updateFeatures: (features) => {
    return apiClient
      .put("/api/feature-management/features", { providerName: "T", features })
      .then((r) => r.data);
  },
};

export default SettingsService;