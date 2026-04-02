# 🚀 AMS Ticketing System


[![Frontend](https://img.shields.io/badge/Frontend-React_19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-ABP_Framework-red?style=for-the-badge&logo=dotnet)](https://abp.io/)
[![Security](https://img.shields.io/badge/Security-OIDC-orange?style=for-the-badge&logo=openidconnect)](https://openid.net/connect/)

---

## 🏗️ Backend Architecture

The dashboard is powered by a robust, enterprise-grade backend built with the **ABP Framework** (v8.x). It follows **Domain-Driven Design (DDD)** principles and provides a modular, scalable foundation.

### 🔐 Multi-Layered Security
- **Identity Server / OpenIddict**: Integrated OIDC (OpenID Connect) provider for secure authentication.
- **Scope-Based Access**: Utilizes `openid`, `profile`, `email`, `roles`, and `offline_access` scopes.
- **Permission System**: Fine-grained authorization where every UI action is validated against backend-stored permissions (e.g., `Billing.AMSTickets`, `AbpIdentity.Users`).
- **CSRF Protection**: Native XSRF/CSRF token validation via `RequestVerificationToken` headers in all state-changing requests (POST/PUT/DELETE).

### ⚙️ Core Infrastructure
- **Multi-Tenancy**: Built-in support for multiple tenants using the `__tenant` header tracking.
- **Audit Logging**: Automated middleware that captures deep audit logs for every API interaction, accessible via the `AuditLogs` module.
- **Setting Management**: Centralized management for system-wide configurations, including emailing (SMTP) and feature toggles.
- **API Versioning**: Standardized RESTful endpoints with versioning support (`api-version: 1.0`).

---

## ✨ Key Features (Frontend)

### 🔐 Security & Access Control
- **OIDC Integration**: Powered by `oidc-client-ts` with automated silent token renewal.
- **Advanced RBAC**: Granular UI visibility using a system-wide `PermissionGuard`.
- **Protected Routing**: Specialized `ProtectedRoute` logic with automated redirect loops for expired sessions.

### 💼 Business Modules
- **Identity Management**: Full administration for Users and Roles.
- **Billing & Tracking**: Advanced Jobsheet management and User Working Hours tracking.
- **Reporting Engine**: Dynamic reports for AMS Tickets, Commission tracking, and After-Hours efficiency.
- **Master Data**: Management center for Countries, Sites, Task Categories, and Work Codes.

---

## 🛠️ Combined Tech Stack

| Category | Frontend | Backend |
| :--- | :--- | :--- |
| **Framework** | React 19, Vite 8 | .NET Core / ABP Framework |
| **Auth** | OIDC Client, React Context | Identity Server / OpenIddict |
| **API** | Axios (Interceptor enabled) | RESTful API (DDD Architecture) |
| **Styling** | Tailwind CSS 4, MUI | N/A |
| **Database** | N/A | SQL Server / PostgreSQL (via EF Core) |

---

## 🚀 Getting Started

### Backend Connection
The frontend is configured to communicate with the following authority:
- **Authority URL**
- **Client ID**

Ensure your backend server is running and the `Redirect URI` (`/auth/callback`) is whitelisted in the Identity Server configuration.
