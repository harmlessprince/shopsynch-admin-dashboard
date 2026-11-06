import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { logger } from "~/utils/helpers.js";

// Helper for date presets
export function calculateDateRange(preset) {
  const now = new Date();
  const to = new Date(now);

  if (preset === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (preset === "7d") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (preset === "thisMonth") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  // Default: last 30 days
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function stripEmptyParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

// ---------------------------------------------------------
// Realistic Mock Fallbacks (aligned with API contract)
// ---------------------------------------------------------
const MOCK_OVERVIEW = {
  totalCostUsd: 142.85,
  totalCostNgn: 214275.0,
  usdToNgnRate: 1500.0,
  questionCount: 18450,
  callCount: 22100,
  failedCallCount: 112,
  totalInputTokens: 45200000,
  totalOutputTokens: 6800000,
  totalTokens: 52000000,
  activeTenantsCount: 142,
  activeUsersCount: 385,
  avgCostPerQuestionUsd: 0.0077,
  avgLatencyMillis: 2450,
  circuitBreaker: {
    todayQuestionsUsed: 1320,
    dailyCeiling: 5000,
    percentageUsed: 26.4,
  },
};

const MOCK_TIMESERIES = [
  { timestamp: "2026-10-31T00:00:00Z", questionCount: 520, callCount: 640, failedCallCount: 3, totalTokens: 1450000, costUsd: 3.92 },
  { timestamp: "2026-11-01T00:00:00Z", questionCount: 612, callCount: 780, failedCallCount: 4, totalTokens: 1820000, costUsd: 4.85 },
  { timestamp: "2026-11-02T00:00:00Z", questionCount: 590, callCount: 720, failedCallCount: 2, totalTokens: 1710000, costUsd: 4.62 },
  { timestamp: "2026-11-03T00:00:00Z", questionCount: 680, callCount: 840, failedCallCount: 6, totalTokens: 1980000, costUsd: 5.41 },
  { timestamp: "2026-11-04T00:00:00Z", questionCount: 740, callCount: 910, failedCallCount: 5, totalTokens: 2150000, costUsd: 5.88 },
  { timestamp: "2026-11-05T00:00:00Z", questionCount: 810, callCount: 990, failedCallCount: 3, totalTokens: 2360000, costUsd: 6.45 },
  { timestamp: "2026-11-06T00:00:00Z", questionCount: 890, callCount: 1080, failedCallCount: 7, totalTokens: 2580000, costUsd: 7.12 },
];

const MOCK_PROVIDER_BREAKDOWN = [
  { key: "deepseek", callCount: 15200, failedCallCount: 40, totalTokens: 34000000, costUsd: 68.2, avgLatencyMillis: 1850 },
  { key: "openai", callCount: 4800, failedCallCount: 52, totalTokens: 12500000, costUsd: 54.8, avgLatencyMillis: 2950 },
  { key: "nvidia", callCount: 2100, failedCallCount: 20, totalTokens: 5500000, costUsd: 19.85, avgLatencyMillis: 2200 },
];

const MOCK_CHANNEL_BREAKDOWN = [
  { key: "DASHBOARD", callCount: 12850, failedCallCount: 60, totalTokens: 30200000, costUsd: 83.1, avgLatencyMillis: 2200 },
  { key: "TELEGRAM", callCount: 5850, failedCallCount: 34, totalTokens: 13900000, costUsd: 38.25, avgLatencyMillis: 2550 },
  { key: "WHATSAPP", callCount: 3400, failedCallCount: 18, totalTokens: 7900000, costUsd: 21.5, avgLatencyMillis: 2800 },
];

const MOCK_MODEL_BREAKDOWN = [
  { key: "deepseek-chat", callCount: 15200, failedCallCount: 40, totalTokens: 34000000, costUsd: 68.2, avgLatencyMillis: 1850 },
  { key: "gpt-4o-mini", callCount: 4200, failedCallCount: 45, totalTokens: 11000000, costUsd: 46.2, avgLatencyMillis: 2800 },
  { key: "gpt-4o", callCount: 600, failedCallCount: 7, totalTokens: 1500000, costUsd: 8.6, avgLatencyMillis: 3400 },
  { key: "meta/llama-3.1-70b-instruct", callCount: 2100, failedCallCount: 20, totalTokens: 5500000, costUsd: 19.85, avgLatencyMillis: 2200 },
];

const MOCK_TENANTS = [
  {
    tenantId: "6563a1e9481b0123456789aa",
    storeName: "Glow Cosmetics",
    planCode: "PRO",
    questionCount: 184,
    monthlyLimit: 250,
    allowanceUsedPercentage: 73.6,
    callCount: 240,
    failedCallCount: 2,
    totalTokens: 580000,
    totalCostUsd: 1.42,
    totalCostNgn: 2130.0,
    activeStaffCount: 4,
    costShareOfRevenue: 0.085,
  },
  {
    tenantId: "6563a2f891bc0234567890bb",
    storeName: "Urban Haven Fashion",
    planCode: "ENTERPRISE",
    questionCount: 485,
    monthlyLimit: 1000,
    allowanceUsedPercentage: 48.5,
    callCount: 610,
    failedCallCount: 5,
    totalTokens: 1420000,
    totalCostUsd: 3.85,
    totalCostNgn: 5775.0,
    activeStaffCount: 8,
    costShareOfRevenue: 0.042,
  },
  {
    tenantId: "6563a3c712de0345678901cc",
    storeName: "SwiftGadgets Nigeria",
    planCode: "GROWTH",
    questionCount: 96,
    monthlyLimit: 100,
    allowanceUsedPercentage: 96.0,
    callCount: 125,
    failedCallCount: 1,
    totalTokens: 310000,
    totalCostUsd: 0.82,
    totalCostNgn: 1230.0,
    activeStaffCount: 3,
    costShareOfRevenue: 0.11,
  },
  {
    tenantId: "6563a4d634ef0456789012dd",
    storeName: "Organic Delights Supermarket",
    planCode: "STARTER",
    questionCount: 42,
    monthlyLimit: 50,
    allowanceUsedPercentage: 84.0,
    callCount: 55,
    failedCallCount: 0,
    totalTokens: 140000,
    totalCostUsd: 0.36,
    totalCostNgn: 540.0,
    activeStaffCount: 2,
    costShareOfRevenue: 0.095,
  },
  {
    tenantId: "6563a5b556fa0567890123ee",
    storeName: "Kiddies Corner Abuja",
    planCode: "PRO",
    questionCount: 210,
    monthlyLimit: 250,
    allowanceUsedPercentage: 84.0,
    callCount: 260,
    failedCallCount: 3,
    totalTokens: 640000,
    totalCostUsd: 1.68,
    totalCostNgn: 2520.0,
    activeStaffCount: 5,
    costShareOfRevenue: 0.078,
  },
  {
    tenantId: "6563a6e478bc0678901234ff",
    storeName: "Prime Footwear Co.",
    planCode: "FREE",
    questionCount: 18,
    monthlyLimit: 20,
    allowanceUsedPercentage: 90.0,
    callCount: 22,
    failedCallCount: 1,
    totalTokens: 52000,
    totalCostUsd: 0.14,
    totalCostNgn: 210.0,
    activeStaffCount: 1,
    costShareOfRevenue: 0.15,
  },
];

const MOCK_STAFF_MAP = {
  "6563a1e9481b0123456789aa": [
    {
      userId: "usr_991823",
      name: "Amina Bello",
      email: "amina@glowcosmetics.com",
      role: "MANAGER",
      questionCount: 92,
      callCount: 110,
      totalTokens: 280000,
      costUsd: 0.69,
      preferredChannel: "DASHBOARD",
      lastActiveAt: "2026-11-06T09:14:22Z",
    },
    {
      userId: "usr_991824",
      name: "Chukwudi Okafor",
      email: "chukwudi@glowcosmetics.com",
      role: "OWNER",
      questionCount: 54,
      callCount: 72,
      totalTokens: 185000,
      costUsd: 0.46,
      preferredChannel: "TELEGRAM",
      lastActiveAt: "2026-11-06T08:42:10Z",
    },
    {
      userId: "usr_991825",
      name: "Folake Adebayo",
      email: "folake@glowcosmetics.com",
      role: "SALES_ASSOCIATE",
      questionCount: 28,
      callCount: 38,
      totalTokens: 82000,
      costUsd: 0.20,
      preferredChannel: "WHATSAPP",
      lastActiveAt: "2026-11-05T17:15:30Z",
    },
    {
      userId: "usr_991826",
      name: "Ibrahim Musa",
      email: "ibrahim@glowcosmetics.com",
      role: "SUPPORT",
      questionCount: 10,
      callCount: 20,
      totalTokens: 33000,
      costUsd: 0.07,
      preferredChannel: "DASHBOARD",
      lastActiveAt: "2026-11-04T12:00:00Z",
    },
  ],
};

const MOCK_TOOLS = [
  { toolName: "get_revenue_metrics", timesUsed: 1840, timesOffered: 6200 },
  { toolName: "list_orders", timesUsed: 1420, timesOffered: 5100 },
  { toolName: "list_bookings", timesUsed: 890, timesOffered: 3400 },
  { toolName: "search_products", timesUsed: 780, timesOffered: 4200 },
  { toolName: "check_inventory_stock", timesUsed: 620, timesOffered: 2900 },
  { toolName: "update_order_status", timesUsed: 430, timesOffered: 1800 },
  { toolName: "fetch_customer_details", timesUsed: 310, timesOffered: 1500 },
];

const MOCK_EVENTS = [
  {
    id: "evt_6724a1b029384756",
    tenantId: "6563a1e9481b0123456789aa",
    tenantName: "Glow Cosmetics",
    userId: "usr_991823",
    userName: "Amina Bello",
    channel: "DASHBOARD",
    provider: "deepseek",
    model: "deepseek-chat",
    inputTokens: 3200,
    outputTokens: 450,
    totalTokens: 3650,
    latencyMillis: 1920,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00062,
    occurredAt: "2026-11-06T10:15:30Z",
  },
  {
    id: "evt_6724a1b029384757",
    tenantId: "6563a2f891bc0234567890bb",
    tenantName: "Urban Haven Fashion",
    userId: "usr_882910",
    userName: "Tariq Danladi",
    channel: "TELEGRAM",
    provider: "openai",
    model: "gpt-4o-mini",
    inputTokens: 2800,
    outputTokens: 380,
    totalTokens: 3180,
    latencyMillis: 2750,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00078,
    occurredAt: "2026-11-06T10:12:15Z",
  },
  {
    id: "evt_6724a1b029384758",
    tenantId: "6563a3c712de0345678901cc",
    tenantName: "SwiftGadgets Nigeria",
    userId: "usr_773645",
    userName: "Chuka Obi",
    channel: "WHATSAPP",
    provider: "nvidia",
    model: "meta/llama-3.1-70b-instruct",
    inputTokens: 4100,
    outputTokens: 520,
    totalTokens: 4620,
    latencyMillis: 2150,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00095,
    occurredAt: "2026-11-06T10:08:44Z",
  },
  {
    id: "evt_6724a1b029384759",
    tenantId: "6563a4d634ef0456789012dd",
    tenantName: "Organic Delights Supermarket",
    userId: "usr_664532",
    userName: "Grace Olatunji",
    channel: "DASHBOARD",
    provider: "deepseek",
    model: "deepseek-chat",
    inputTokens: 1850,
    outputTokens: 120,
    totalTokens: 1970,
    latencyMillis: 3420,
    success: false,
    failureReason: "Tool call execution timeout on get_revenue_metrics",
    estimatedCostUsd: 0.00032,
    occurredAt: "2026-11-06T09:55:12Z",
  },
  {
    id: "evt_6724a1b029384760",
    tenantId: "6563a5b556fa0567890123ee",
    tenantName: "Kiddies Corner Abuja",
    userId: "usr_556421",
    userName: "Hauwa Ahmed",
    channel: "DASHBOARD",
    provider: "openai",
    model: "gpt-4o-mini",
    inputTokens: 2450,
    outputTokens: 310,
    totalTokens: 2760,
    latencyMillis: 2600,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00065,
    occurredAt: "2026-11-06T09:41:05Z",
  },
  {
    id: "evt_6724a1b029384761",
    tenantId: "6563a1e9481b0123456789aa",
    tenantName: "Glow Cosmetics",
    userId: "usr_991824",
    userName: "Chukwudi Okafor",
    channel: "TELEGRAM",
    provider: "deepseek",
    model: "deepseek-chat",
    inputTokens: 3900,
    outputTokens: 610,
    totalTokens: 4510,
    latencyMillis: 1820,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00084,
    occurredAt: "2026-11-06T09:30:20Z",
  },
  {
    id: "evt_6724a1b029384762",
    tenantId: "6563a6e478bc0678901234ff",
    tenantName: "Prime Footwear Co.",
    userId: "usr_447312",
    userName: "Emeka Eze",
    channel: "WHATSAPP",
    provider: "nvidia",
    model: "meta/llama-3.1-70b-instruct",
    inputTokens: 1950,
    outputTokens: 240,
    totalTokens: 2190,
    latencyMillis: 2050,
    success: true,
    failureReason: null,
    estimatedCostUsd: 0.00045,
    occurredAt: "2026-11-06T09:15:55Z",
  },
  {
    id: "evt_6724a1b029384763",
    tenantId: "6563a2f891bc0234567890bb",
    tenantName: "Urban Haven Fashion",
    userId: "usr_882911",
    userName: "Zainab Aliyu",
    channel: "DASHBOARD",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 5200,
    outputTokens: 890,
    totalTokens: 6090,
    latencyMillis: 4100,
    success: false,
    failureReason: "Model rate limit threshold reached",
    estimatedCostUsd: 0.0031,
    occurredAt: "2026-11-06T08:58:10Z",
  },
];

// ---------------------------------------------------------
// Pinia Store Definition
// ---------------------------------------------------------
export const useAdminAiAnalyticsStore = defineStore("adminAiAnalyticsStore", () => {
  const { get } = useApiService();

  // State
  const datePreset = ref("30d");
  const initialRange = calculateDateRange("30d");
  const fromDate = ref(initialRange.from);
  const toDate = ref(initialRange.to);
  const activeTenantId = ref("");

  // Data
  const overview = ref(MOCK_OVERVIEW);
  const timeseries = ref(MOCK_TIMESERIES);
  const providerBreakdown = ref(MOCK_PROVIDER_BREAKDOWN);
  const channelBreakdown = ref(MOCK_CHANNEL_BREAKDOWN);
  const modelBreakdown = ref(MOCK_MODEL_BREAKDOWN);
  const tools = ref(MOCK_TOOLS);

  // Tenants Rollup Table
  const tenants = ref({
    items: MOCK_TENANTS,
    page: 0,
    size: 10,
    totalElements: MOCK_TENANTS.length,
    totalPages: 1,
  });

  // Tenant Staff Drawer state
  const selectedTenant = ref(null);
  const staffData = ref({
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 1,
    loading: false,
    error: "",
  });

  // Raw Events Explorer
  const events = ref({
    items: MOCK_EVENTS,
    page: 0,
    size: 20,
    totalElements: MOCK_EVENTS.length,
    totalPages: 1,
  });

  // Loading states
  const loadingOverview = ref(false);
  const loadingTimeseries = ref(false);
  const loadingBreakdown = ref(false);
  const loadingTenants = ref(false);
  const loadingTools = ref(false);
  const loadingEvents = ref(false);
  const globalError = ref("");

  // Common date filters
  const dateParams = computed(() =>
    stripEmptyParams({
      from: fromDate.value,
      to: toDate.value,
      tenantId: activeTenantId.value || undefined,
    })
  );

  // 1. Fetch Overview
  async function fetchOverview() {
    loadingOverview.value = true;
    try {
      const response = await get(endpoints.admin.assistantAnalytics.overview, dateParams.value, { forceMode: "live" });
      if (response?.data) {
        overview.value = response.data;
      }
    } catch (err) {
      logger.warn("Live assistant overview endpoint unavailable, using mock fallbacks:", err);
      // Keep mock data intact
    } finally {
      loadingOverview.value = false;
    }
  }

  // 2. Fetch Timeseries
  async function fetchTimeseries(interval = "DAILY") {
    loadingTimeseries.value = true;
    try {
      const params = { ...dateParams.value, interval };
      const response = await get(endpoints.admin.assistantAnalytics.timeseries, params, { forceMode: "live" });
      if (Array.isArray(response?.data) && response.data.length > 0) {
        timeseries.value = response.data;
      }
    } catch (err) {
      logger.warn("Live assistant timeseries endpoint unavailable, using mock fallbacks:", err);
    } finally {
      loadingTimeseries.value = false;
    }
  }

  // 3. Fetch Dimension Breakdowns
  async function fetchBreakdowns() {
    loadingBreakdown.value = true;
    try {
      const [provRes, chanRes, modRes] = await Promise.allSettled([
        get(endpoints.admin.assistantAnalytics.breakdown, { ...dateParams.value, groupBy: "PROVIDER" }, { forceMode: "live" }),
        get(endpoints.admin.assistantAnalytics.breakdown, { ...dateParams.value, groupBy: "CHANNEL" }, { forceMode: "live" }),
        get(endpoints.admin.assistantAnalytics.breakdown, { ...dateParams.value, groupBy: "MODEL" }, { forceMode: "live" }),
      ]);

      if (provRes.status === "fulfilled" && Array.isArray(provRes.value?.data)) {
        providerBreakdown.value = provRes.value.data;
      }
      if (chanRes.status === "fulfilled" && Array.isArray(chanRes.value?.data)) {
        channelBreakdown.value = chanRes.value.data;
      }
      if (modRes.status === "fulfilled" && Array.isArray(modRes.value?.data)) {
        modelBreakdown.value = modRes.value.data;
      }
    } catch (err) {
      logger.warn("Live assistant breakdown endpoints unavailable, using mock fallbacks:", err);
    } finally {
      loadingBreakdown.value = false;
    }
  }

  // 4. Fetch Tenants Rollup
  async function fetchTenants(customParams = {}) {
    loadingTenants.value = true;
    try {
      const params = stripEmptyParams({
        ...dateParams.value,
        page: customParams.page ?? tenants.value.page,
        size: customParams.size ?? tenants.value.size,
        search: customParams.search,
        planCode: customParams.planCode,
      });

      const response = await get(endpoints.admin.assistantAnalytics.tenants, params, { forceMode: "live" });
      if (response?.data?.items) {
        tenants.value = {
          items: response.data.items,
          page: response.data.page ?? 0,
          size: response.data.size ?? 20,
          totalElements: response.data.totalElements ?? response.data.items.length,
          totalPages: response.data.totalPages ?? 1,
        };
      } else {
        applyMockTenantFiltering(customParams);
      }
    } catch (err) {
      logger.warn("Live assistant tenants endpoint unavailable, using mock filtering:", err);
      applyMockTenantFiltering(customParams);
    } finally {
      loadingTenants.value = false;
    }
  }

  function applyMockTenantFiltering(filters = {}) {
    let filtered = [...MOCK_TENANTS];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.storeName.toLowerCase().includes(s) || t.tenantId.toLowerCase().includes(s)
      );
    }
    if (filters.planCode) {
      filtered = filtered.filter((t) => t.planCode.toUpperCase() === filters.planCode.toUpperCase());
    }
    tenants.value = {
      items: filtered,
      page: filters.page ?? 0,
      size: filters.size ?? 10,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / (filters.size ?? 10))),
    };
  }

  // 5. Fetch Tenant Staff Detail
  async function fetchTenantStaff(tenant, customParams = {}) {
    selectedTenant.value = tenant;
    staffData.value.loading = true;
    staffData.value.error = "";

    const tenantId = typeof tenant === "string" ? tenant : tenant.tenantId;

    try {
      const endpoint = endpoints.admin.assistantAnalytics.tenantStaff.replace(":tenantId", tenantId);
      const params = stripEmptyParams({
        ...dateParams.value,
        page: customParams.page ?? 0,
        size: customParams.size ?? 20,
      });

      const response = await get(endpoint, params, { forceMode: "live" });
      if (response?.data?.items) {
        staffData.value = {
          items: response.data.items,
          page: response.data.page ?? 0,
          size: response.data.size ?? 20,
          totalElements: response.data.totalElements ?? response.data.items.length,
          totalPages: response.data.totalPages ?? 1,
          loading: false,
          error: "",
        };
        return;
      }
      applyMockStaffData(tenantId);
    } catch (err) {
      logger.warn(`Live staff endpoint for ${tenantId} unavailable, using mock staff list:`, err);
      applyMockStaffData(tenantId);
    } finally {
      staffData.value.loading = false;
    }
  }

  function applyMockStaffData(tenantId) {
    const list = MOCK_STAFF_MAP[tenantId] || [
      {
        userId: `usr_${tenantId.slice(-4)}_1`,
        name: "Primary Admin",
        email: "admin@store.com",
        role: "OWNER",
        questionCount: 45,
        callCount: 60,
        totalTokens: 125000,
        costUsd: 0.32,
        preferredChannel: "DASHBOARD",
        lastActiveAt: new Date().toISOString(),
      },
      {
        userId: `usr_${tenantId.slice(-4)}_2`,
        name: "Store Supervisor",
        email: "staff@store.com",
        role: "MANAGER",
        questionCount: 22,
        callCount: 30,
        totalTokens: 62000,
        costUsd: 0.16,
        preferredChannel: "TELEGRAM",
        lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    staffData.value = {
      items: list,
      page: 0,
      size: 20,
      totalElements: list.length,
      totalPages: 1,
      loading: false,
      error: "",
    };
  }

  // 6. Fetch Tools Utilization
  async function fetchTools() {
    loadingTools.value = true;
    try {
      const response = await get(endpoints.admin.assistantAnalytics.tools, dateParams.value, { forceMode: "live" });
      if (Array.isArray(response?.data) && response.data.length > 0) {
        tools.value = response.data;
      }
    } catch (err) {
      logger.warn("Live assistant tools endpoint unavailable, using mock fallbacks:", err);
    } finally {
      loadingTools.value = false;
    }
  }

  // 7. Fetch Raw Events Explorer
  async function fetchEvents(customParams = {}) {
    loadingEvents.value = true;
    try {
      const params = stripEmptyParams({
        ...dateParams.value,
        page: customParams.page ?? events.value.page,
        size: customParams.size ?? events.value.size,
        channel: customParams.channel,
        provider: customParams.provider,
        success: customParams.success !== "" && customParams.success !== undefined ? customParams.success : undefined,
        search: customParams.search,
      });

      const response = await get(endpoints.admin.assistantAnalytics.events, params, { forceMode: "live" });
      if (response?.data?.items) {
        events.value = {
          items: response.data.items,
          page: response.data.page ?? 0,
          size: response.data.size ?? 20,
          totalElements: response.data.totalElements ?? response.data.items.length,
          totalPages: response.data.totalPages ?? 1,
        };
      } else {
        applyMockEventFiltering(customParams);
      }
    } catch (err) {
      logger.warn("Live events endpoint unavailable, applying mock event filter:", err);
      applyMockEventFiltering(customParams);
    } finally {
      loadingEvents.value = false;
    }
  }

  function applyMockEventFiltering(filters = {}) {
    let filtered = [...MOCK_EVENTS];
    if (filters.channel) {
      filtered = filtered.filter((e) => e.channel.toUpperCase() === filters.channel.toUpperCase());
    }
    if (filters.provider) {
      filtered = filtered.filter((e) => e.provider.toLowerCase() === filters.provider.toLowerCase());
    }
    if (filters.success !== "" && filters.success !== undefined) {
      const boolVal = filters.success === "true" || filters.success === true;
      filtered = filtered.filter((e) => e.success === boolVal);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.tenantId.toLowerCase().includes(s) ||
          e.userId.toLowerCase().includes(s) ||
          (e.tenantName && e.tenantName.toLowerCase().includes(s)) ||
          (e.userName && e.userName.toLowerCase().includes(s)) ||
          (e.failureReason && e.failureReason.toLowerCase().includes(s))
      );
    }
    events.value = {
      items: filtered,
      page: filters.page ?? 0,
      size: filters.size ?? 20,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / (filters.size ?? 20))),
    };
  }

  // Date Filter actions
  function setDatePreset(preset) {
    datePreset.value = preset;
    const range = calculateDateRange(preset);
    fromDate.value = range.from;
    toDate.value = range.to;
  }

  function setCustomDateRange(from, to) {
    datePreset.value = "custom";
    fromDate.value = new Date(from).toISOString();
    toDate.value = new Date(to).toISOString();
  }

  // Refresh all sections
  async function refreshAll() {
    await Promise.allSettled([
      fetchOverview(),
      fetchTimeseries(),
      fetchBreakdowns(),
      fetchTenants(),
      fetchTools(),
      fetchEvents(),
    ]);
  }

  return {
    // State
    datePreset,
    fromDate,
    toDate,
    activeTenantId,
    overview,
    timeseries,
    providerBreakdown,
    channelBreakdown,
    modelBreakdown,
    tools,
    tenants,
    selectedTenant,
    staffData,
    staff: staffData,
    loadingStaff: computed(() => staffData.value?.loading || false),
    events,
    loadingOverview,
    loadingTimeseries,
    loadingBreakdown,
    loadingTenants,
    loadingTools,
    loadingEvents,
    globalError,
    // Actions
    setDatePreset,
    setCustomDateRange,
    fetchOverview,
    fetchTimeseries,
    fetchBreakdowns,
    fetchTenants,
    fetchTenantStaff,
    fetchTools,
    fetchEvents,
    refreshAll,
  };
});
