export const endpoints = {
    login: "/v1/auth/login",
    refreshToken: "/v1/auth/refresh-token",
    logout: "/v1/auth/logout",
    requestPasswordReset: "/v1/password/forgot/request/merchant",
    resetPassword: "/v1/password/reset/merchant",
    verifyPasswordResetToken: "/v1/verify/merchant/reset-password-token",
    changePassword: "/v1/change/password/merchant",
    googleMerchantLoginInitiate: "/v1/auth/social/google/merchant/initiate",
    userProfile: "/v1/admin/auth/profile",

    admin: {
        dashboard: {
            overview: "/v1/admin/dashboard/overview",
            merchantTrend: "/v1/admin/dashboard/merchants/trend",
            complianceSummary: "/v1/admin/dashboard/compliance/summary",
        },
        merchants: {
            list: "/v1/admin/merchants",
            complianceQueue: "/v1/admin/merchants/compliance-queue",
            detail: "/v1/admin/merchants/:tenantId",
            updateStatus: "/v1/admin/merchants/:tenantId/status",
            paymentSecrets: "/v1/admin/merchants/:tenantId/payment-secrets",
        },
        compliance: {
            tenantDetail: "/v1/admin/compliance/tenants/:tenantId",
            review: "/v1/admin/compliance/tenants/:tenantId/review",
            filesReview: "/v1/admin/compliance/tenants/:tenantId/files/review",
            rejectionTemplates: "/v1/admin/compliance/rejection-templates",
            override: "/v1/admin/compliance/tenants/:tenantId/override",
        },
        users: {
            list: "/v1/admin/users",
            detail: "/v1/admin/users/:userId",
            updateStatus: "/v1/admin/users/:userId/status",
        },
        settings: {
            list: "/v1/admin/settings",
            upsert: "/v1/admin/settings",
            updateValue: "/v1/admin/settings/:key/value",
            delete: "/v1/admin/settings/:key",
        },
        cache: {
            list: "/v1/admin/cache",
            clearAll: "/v1/admin/cache",
            clearByName: "/v1/admin/cache/:cacheName",
            clearTenant: "/v1/admin/cache/tenant/:tenantId",
        },
        logistics: {
            shipments: "/v1/admin/logistics/shipments",
            usage: "/v1/admin/logistics/shipments/usage",
            waybillFailures: "/v1/admin/logistics/shipments/waybill-failures",
            weightAdjustments: "/v1/admin/logistics/weight-adjustments",
            resolveAdjustment: "/v1/admin/logistics/weight-adjustments/:adjustmentId/resolve",
        },
    },
}
