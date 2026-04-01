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
      smtpPassword: settings.password ?? null,
      smtpDomain: settings.domain ?? "",
      smtpEnableSsl: settings.enableSsl,
      smtpUseDefaultCredentials: settings.useDefaultCredentials,
      defaultFromAddress: settings.defaultFromAddress,
      defaultFromDisplayName: settings.defaultFromDisplayName,
    };
    return apiClient.post("/api/setting-management/emailing", payload).then((r) => r.data);
  },

  sendTestEmail: (emailAddress) => {
    return apiClient
      .post("/api/setting-management/emailing/send-test-email", { emailAddress })
      .then((r) => r.data);
  },
};

export default SettingsService;