<script setup>
import { logger } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-plans",
});

useHead({
  title: "Billing Plans - ShopSynch Admin",
});

const billingPlansStore = useAdminBillingPlansStore();

const statusFilter = ref("");
const showPlanModal = ref(false);
const editingPlan = ref(null);
const planJsonError = ref("");
const priceJsonError = ref("");
const editingPrice = ref(null);

const planStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"];
const statusOptions = planStatuses.map((status) => ({ label: status.replace(/_/g, " "), value: status }));
const statusFilterOptions = [{ label: "All statuses", value: "" }, ...statusOptions];

const planTableHeader = [
  { title: "Plan", accessor: "name" },
  { title: "Code", accessor: "code" },
  { title: "Status", accessor: "status" },
  { title: "Base Price", accessor: "baseSubscriptionPrice" },
  { title: "Visibility", accessor: "publicVisible" },
  { title: "Admin-only", accessor: "adminOnly" },
  { title: "Action", accessor: "_action" },
];

const priceTableHeader = [
  { title: "Period", accessor: "periodUnitCount" },
  { title: "Amount", accessor: "amount" },
  { title: "Currency", accessor: "currency" },
  { title: "Active", accessor: "active" },
  { title: "Visibility", accessor: "publicVisible" },
  { title: "Admin-only", accessor: "adminOnly" },
  { title: "Sort", accessor: "sortOrder" },
  { title: "Action", accessor: "_action" },
];

const emptyPlanForm = () => ({
  name: "",
  code: "",
  description: "",
  status: "INACTIVE",
  baseSubscriptionPrice: "0",
  currency: "NGN",
  billingPeriodUnitsText: "1",
  defaultBillingPeriodUnits: "1",
  gracePeriodDays: "7",
  publicVisible: true,
  adminOnly: false,
  sortOrder: "",
  featureEntitlementsJson: "{}",
  usageLimitsJson: "{}",
  checkoutFeePolicyJson: "{}",
  apiUsagePolicyJson: "{}",
  trialPolicyJson: "{}",
  renewalPolicyJson: "{}",
});

const planForm = ref(emptyPlanForm());

const emptyPriceForm = () => ({
  periodUnitCount: "1",
  amount: "0",
  currency: "NGN",
  active: true,
  publicVisible: true,
  adminOnly: false,
  sortOrder: "",
});

const priceForm = ref(emptyPriceForm());

const filteredPlans = computed(() => {
  if (!statusFilter.value) return billingPlansStore.plans;
  return billingPlansStore.plans.filter((plan) => plan.status === statusFilter.value);
});

const selectedPlan = computed(() => billingPlansStore.selectedPlan);

const statusBadgeClass = {
  ACTIVE: "bg-[#B5F9B4] text-[#3CA745]",
  INACTIVE: "bg-[#F3F4F6] text-[#6B7280]",
  ARCHIVED: "bg-[#FFBFBF] text-[#FF3131]",
};

function formatMoney(amount, currency = "NGN") {
  const value = Number(amount || 0);
  return `${currency || "NGN"} ${value.toLocaleString()}`;
}

function parseJsonField(value, label) {
  if (!String(value || "").trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function normalizeOptionalInteger(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}

function mapPlanToForm(plan) {
  return {
    name: plan.name || "",
    code: plan.code || "",
    description: plan.description || "",
    status: plan.status || "INACTIVE",
    baseSubscriptionPrice: String(plan.baseSubscriptionPrice ?? 0),
    currency: plan.currency || "NGN",
    billingPeriodUnitsText: (plan.billingPeriodUnits || [1]).join(", "),
    defaultBillingPeriodUnits: String(plan.defaultBillingPeriodUnits ?? 1),
    gracePeriodDays: String(plan.gracePeriodDays ?? 7),
    publicVisible: plan.publicVisible !== false,
    adminOnly: plan.adminOnly === true,
    sortOrder: plan.sortOrder ?? "",
    featureEntitlementsJson: JSON.stringify(plan.featureEntitlements || {}, null, 2),
    usageLimitsJson: JSON.stringify(plan.usageLimits || {}, null, 2),
    checkoutFeePolicyJson: JSON.stringify(plan.checkoutFeePolicy || {}, null, 2),
    apiUsagePolicyJson: JSON.stringify(plan.apiUsagePolicy || {}, null, 2),
    trialPolicyJson: JSON.stringify(plan.trialPolicy || {}, null, 2),
    renewalPolicyJson: JSON.stringify(plan.renewalPolicy || {}, null, 2),
  };
}

function buildPlanPayload() {
  const billingPeriodUnits = planForm.value.billingPeriodUnitsText
    .split(",")
    .map((period) => Number(period.trim()))
    .filter((period) => Number.isFinite(period) && period > 0);

  return {
    name: planForm.value.name,
    code: planForm.value.code,
    description: planForm.value.description,
    status: planForm.value.status,
    baseSubscriptionPrice: Number(planForm.value.baseSubscriptionPrice || 0),
    currency: planForm.value.currency || "NGN",
    billingPeriodUnits: billingPeriodUnits.length ? billingPeriodUnits : [1],
    defaultBillingPeriodUnits: Number(planForm.value.defaultBillingPeriodUnits || 1),
    gracePeriodDays: Number(planForm.value.gracePeriodDays || 0),
    publicVisible: planForm.value.publicVisible,
    adminOnly: planForm.value.adminOnly,
    sortOrder: normalizeOptionalInteger(planForm.value.sortOrder),
    featureEntitlements: parseJsonField(planForm.value.featureEntitlementsJson, "Feature entitlements"),
    usageLimits: parseJsonField(planForm.value.usageLimitsJson, "Usage limits"),
    checkoutFeePolicy: parseJsonField(planForm.value.checkoutFeePolicyJson, "Checkout fee policy"),
    apiUsagePolicy: parseJsonField(planForm.value.apiUsagePolicyJson, "API usage policy"),
    trialPolicy: parseJsonField(planForm.value.trialPolicyJson, "Trial policy"),
    renewalPolicy: parseJsonField(planForm.value.renewalPolicyJson, "Renewal policy"),
  };
}

function openCreatePlan() {
  editingPlan.value = null;
  planForm.value = emptyPlanForm();
  planJsonError.value = "";
  showPlanModal.value = true;
}

function openEditPlan(plan) {
  editingPlan.value = plan;
  planForm.value = mapPlanToForm(plan);
  planJsonError.value = "";
  showPlanModal.value = true;
}

async function selectPlan(plan) {
  billingPlansStore.selectPlan(plan);
  resetPriceForm();
  try {
    await billingPlansStore.fetchPrices(plan.id);
  } catch (err) {
    logger.error("Failed to load billing plan prices", err);
  }
}

async function savePlan() {
  planJsonError.value = "";
  try {
    const payload = buildPlanPayload();
    const response = editingPlan.value
      ? await billingPlansStore.updatePlan(editingPlan.value.id, payload)
      : await billingPlansStore.createPlan(payload);

    if (response) {
      showPlanModal.value = false;
      await billingPlansStore.fetchPlans();
      const savedPlan = response?.data;
      if (savedPlan?.id) {
        await selectPlan(savedPlan);
      }
    }
  } catch (err) {
    planJsonError.value = err?.message || "Unable to save billing plan.";
    logger.error("Failed to save billing plan", err);
  }
}

async function archiveSelectedPlan() {
  if (!selectedPlan.value?.id) return;
  try {
    const response = await billingPlansStore.archivePlan(selectedPlan.value.id);
    if (response) {
      await billingPlansStore.fetchPlans();
      if (response?.data) {
        await selectPlan(response.data);
      }
    }
  } catch (err) {
    logger.error("Failed to archive billing plan", err);
  }
}

function mapPriceToForm(price) {
  return {
    periodUnitCount: String(price.periodUnitCount ?? 1),
    amount: String(price.amount ?? 0),
    currency: price.currency || "NGN",
    active: price.active !== false,
    publicVisible: price.publicVisible !== false,
    adminOnly: price.adminOnly === true,
    sortOrder: price.sortOrder ?? "",
  };
}

function resetPriceForm() {
  editingPrice.value = null;
  priceForm.value = emptyPriceForm();
  priceJsonError.value = "";
}

function editPrice(price) {
  editingPrice.value = price;
  priceForm.value = mapPriceToForm(price);
  priceJsonError.value = "";
}

function buildPricePayload() {
  return {
    periodUnitCount: Number(priceForm.value.periodUnitCount || 1),
    amount: Number(priceForm.value.amount || 0),
    currency: priceForm.value.currency || "NGN",
    active: priceForm.value.active,
    publicVisible: priceForm.value.publicVisible,
    adminOnly: priceForm.value.adminOnly,
    sortOrder: normalizeOptionalInteger(priceForm.value.sortOrder),
  };
}

async function savePrice() {
  if (!selectedPlan.value?.id) return;
  priceJsonError.value = "";
  try {
    const payload = buildPricePayload();
    const response = editingPrice.value
      ? await billingPlansStore.updatePrice(editingPrice.value.id, payload)
      : await billingPlansStore.createPrice(selectedPlan.value.id, payload);

    if (response) {
      resetPriceForm();
      await billingPlansStore.fetchPrices(selectedPlan.value.id);
    }
  } catch (err) {
    priceJsonError.value = err?.message || "Unable to save plan price.";
    logger.error("Failed to save billing plan price", err);
  }
}

onMounted(async () => {
  try {
    await billingPlansStore.fetchPlans();
    if (billingPlansStore.plans.length) {
      await selectPlan(billingPlansStore.plans[0]);
    }
  } catch (err) {
    logger.error("Failed to load billing plans", err);
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Billing Plans</h1>
          <p class="mt-[0.4rem] text-[#616161]">
            Create, archive, price, and inspect merchant subscription plans.
          </p>
        </div>

        <div class="flex flex-col gap-[1rem] sm:flex-row sm:items-center">
          <BaseSelectInput
            v-model="statusFilter"
            :options="statusFilterOptions"
            input-class="min-w-[18rem]"
          />
          <BaseButton radius="8px" bold @click="openCreatePlan">
            New Plan
          </BaseButton>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-[1.6rem] xl:grid-cols-[minmax(0,1.25fr)_minmax(38rem,0.75fr)]">
      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <DataTable
          :table-header="planTableHeader"
          :table-data="filteredPlans"
          :loading="billingPlansStore.loading"
          :has-pagination="false"
        >
          <template #cell(name)="{ row }">
            <div>
              <p class="font-[700] text-[#000]">{{ row.name }}</p>
              <p class="max-w-[32rem] truncate text-[1.2rem] text-[#616161]">
                {{ row.description || "No description" }}
              </p>
            </div>
          </template>

          <template #cell(code)="{ row }">
            <span class="font-mono text-[1.2rem] font-[700]">{{ row.code }}</span>
          </template>

          <template #cell(status)="{ row }">
            <span
              :class="statusBadgeClass[row.status] || 'bg-gray-100 text-gray-600'"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            >
              {{ row.status }}
            </span>
          </template>

          <template #cell(baseSubscriptionPrice)="{ row }">
            {{ formatMoney(row.baseSubscriptionPrice, row.currency) }}
          </template>

          <template #cell(publicVisible)="{ row }">
            <span
              :class="row.publicVisible ? 'bg-[#B5F9B4] text-[#3CA745]' : 'bg-[#FFF9C5] text-[#E79640]'"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            >
              {{ row.publicVisible ? "Public" : "Hidden" }}
            </span>
          </template>

          <template #cell(adminOnly)="{ row }">
            <span
              :class="row.adminOnly ? 'bg-[#D0E8FF] text-[#0066CC]' : 'bg-slate-100 text-slate-600'"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            >
              {{ row.adminOnly ? "Admin only" : "Merchant selectable" }}
            </span>
          </template>

          <template #cell(_action)="{ row }">
            <div class="flex gap-[0.8rem]">
              <BaseButton radius="6px" size="sm" variant="outline" @click="selectPlan(row)">
                Inspect
              </BaseButton>
              <BaseButton radius="6px" size="sm" @click="openEditPlan(row)">
                Edit
              </BaseButton>
            </div>
          </template>
        </DataTable>
      </section>

      <aside class="space-y-[1.6rem]">
        <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <div v-if="selectedPlan" class="space-y-[1.6rem]">
            <div class="flex items-start justify-between gap-[1rem]">
              <div>
                <p class="text-[1.2rem] font-[700] uppercase tracking-[0.08em] text-[#616161]">
                  Selected plan
                </p>
                <h2 class="mt-[0.4rem] text-[1.8rem] font-[700] text-[#000]">
                  {{ selectedPlan.name }}
                </h2>
                <p class="font-mono text-[1.2rem] text-[#616161]">{{ selectedPlan.code }}</p>
              </div>
              <span
                :class="statusBadgeClass[selectedPlan.status] || 'bg-gray-100 text-gray-600'"
                class="rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
              >
                {{ selectedPlan.status }}
              </span>
            </div>

            <p class="text-[#616161]">{{ selectedPlan.description || "No description provided." }}</p>

            <div class="grid grid-cols-2 gap-[1rem]">
              <div class="rounded-[8px] bg-[#F8FAFC] p-[1.2rem]">
                <p class="text-[1.2rem] text-[#616161]">Base price</p>
                <p class="font-[700] text-[#000]">
                  {{ formatMoney(selectedPlan.baseSubscriptionPrice, selectedPlan.currency) }}
                </p>
              </div>
              <div class="rounded-[8px] bg-[#F8FAFC] p-[1.2rem]">
                <p class="text-[1.2rem] text-[#616161]">Grace period</p>
                <p class="font-[700] text-[#000]">{{ selectedPlan.gracePeriodDays || 0 }} days</p>
              </div>
              <div class="rounded-[8px] bg-[#F8FAFC] p-[1.2rem]">
                <p class="text-[1.2rem] text-[#616161]">Visibility</p>
                <p class="font-[700] text-[#000]">
                  {{ selectedPlan.publicVisible ? "Public" : "Hidden" }}
                </p>
              </div>
              <div class="rounded-[8px] bg-[#F8FAFC] p-[1.2rem]">
                <p class="text-[1.2rem] text-[#616161]">Admin-only</p>
                <p class="font-[700] text-[#000]">
                  {{ selectedPlan.adminOnly ? "Yes" : "No" }}
                </p>
              </div>
            </div>

            <div class="rounded-[8px] border border-[#EDEFF2] p-[1.2rem]">
              <p class="mb-[0.8rem] font-[700] text-[#000]">Billing periods</p>
              <div class="flex flex-wrap gap-[0.8rem]">
                <span
                  v-for="period in selectedPlan.billingPeriodUnits || []"
                  :key="period"
                  class="rounded-full bg-slate-100 px-[1rem] py-[0.4rem] text-[1.2rem] font-[600] text-slate-700"
                >
                  {{ period }} x 30 days
                </span>
                <span v-if="!selectedPlan.billingPeriodUnits?.length" class="text-[#616161]">No periods set.</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-[1rem]">
              <BaseButton radius="8px" variant="outline" @click="openEditPlan(selectedPlan)">
                Edit Plan
              </BaseButton>
              <BaseButton
                radius="8px"
                variant="danger"
                :loading="billingPlansStore.archiving"
                :disabled="selectedPlan.status === 'ARCHIVED'"
                @click="archiveSelectedPlan"
              >
                Archive Plan
              </BaseButton>
            </div>
          </div>

          <div v-else class="py-[4rem] text-center text-[#616161]">
            Select a billing plan to inspect its details and prices.
          </div>
        </section>

        <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
          <div class="mb-[1.6rem]">
            <h2 class="text-[1.8rem] font-[700] text-[#000]">Period Prices</h2>
            <p class="mt-[0.4rem] text-[#616161]">
              Prices are configured in 30-day billing units.
            </p>
          </div>

          <form class="mb-[1.6rem] grid grid-cols-1 gap-[1rem] md:grid-cols-2" @submit.prevent="savePrice">
            <AppInput
              v-model="priceForm.periodUnitCount"
              type="number"
              label="30-day units"
              name="pricePeriodUnitCount"
              placeholder="1"
            />
            <div>
              <label class="mb-[0.8rem] block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]">
                Amount
              </label>
              <input
                v-model="priceForm.amount"
                inputmode="decimal"
                class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="0"
              >
            </div>
            <AppInput
              v-model="priceForm.currency"
              label="Currency"
              name="priceCurrency"
              placeholder="NGN"
            />
            <AppInput
              v-model="priceForm.sortOrder"
              type="number"
              label="Sort order"
              name="priceSortOrder"
              placeholder="Optional"
            />

            <div class="md:col-span-2 grid grid-cols-1 gap-[1rem] sm:grid-cols-3">
              <label class="flex items-center gap-[0.8rem] rounded-[8px] border border-[#EDEFF2] p-[1rem]">
                <input v-model="priceForm.active" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Active
              </label>
              <label class="flex items-center gap-[0.8rem] rounded-[8px] border border-[#EDEFF2] p-[1rem]">
                <input v-model="priceForm.publicVisible" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Public visible
              </label>
              <label class="flex items-center gap-[0.8rem] rounded-[8px] border border-[#EDEFF2] p-[1rem]">
                <input v-model="priceForm.adminOnly" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Admin only
              </label>
            </div>

            <p v-if="priceJsonError" class="md:col-span-2 rounded-[8px] bg-red-50 p-[1rem] text-red-600">
              {{ priceJsonError }}
            </p>

            <div class="md:col-span-2 flex flex-wrap gap-[1rem]">
              <BaseButton
                type="submit"
                radius="8px"
                :loading="billingPlansStore.priceSaving"
                :disabled="!selectedPlan"
              >
                {{ editingPrice ? "Update Price" : "Add Price" }}
              </BaseButton>
              <BaseButton v-if="editingPrice" radius="8px" variant="outline" @click="resetPriceForm">
                Cancel Edit
              </BaseButton>
            </div>
          </form>

          <DataTable
            :table-header="priceTableHeader"
            :table-data="billingPlansStore.prices"
            :loading="billingPlansStore.pricesLoading"
            :has-pagination="false"
          >
            <template #cell(periodUnitCount)="{ row }">
              {{ row.periodUnitCount }} x 30 days
            </template>
            <template #cell(amount)="{ row }">
              {{ formatMoney(row.amount, row.currency) }}
            </template>
            <template #cell(active)="{ row }">
              <span :class="row.active ? 'text-[#3CA745]' : 'text-[#FF3131]'" class="font-[700]">
                {{ row.active ? "Active" : "Inactive" }}
              </span>
            </template>
            <template #cell(publicVisible)="{ row }">
              {{ row.publicVisible ? "Public" : "Hidden" }}
            </template>
            <template #cell(adminOnly)="{ row }">
              {{ row.adminOnly ? "Admin only" : "No" }}
            </template>
            <template #cell(_action)="{ row }">
              <BaseButton radius="6px" size="sm" variant="outline" @click="editPrice(row)">
                Edit
              </BaseButton>
            </template>
          </DataTable>
        </section>
      </aside>
    </div>

    <div
      v-if="showPlanModal"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-[1.6rem]"
      @click.self="showPlanModal = false"
    >
      <div class="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-[12px] bg-white p-[2.4rem] shadow-xl">
        <div class="mb-[2rem] flex items-center justify-between gap-[1rem]">
          <div>
            <h2 class="text-[1.8rem] font-[700] text-[#000]">
              {{ editingPlan ? "Edit Billing Plan" : "Create Billing Plan" }}
            </h2>
            <p class="mt-[0.4rem] text-[#616161]">
              Public and admin-only visibility are shown here before saving.
            </p>
          </div>
          <BaseButton radius="8px" variant="ghost" @click="showPlanModal = false">
            <span class="material-symbols-outlined">close</span>
          </BaseButton>
        </div>

        <form class="space-y-[1.6rem]" @submit.prevent="savePlan">
          <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2">
            <AppInput v-model="planForm.name" label="Name" name="planName" placeholder="Starter" />
            <AppInput v-model="planForm.code" label="Code" name="planCode" placeholder="starter" />
            <BaseSelectInput
              v-model="planForm.status"
              :options="statusOptions"
              label="Status"
              placeholder="Select status"
            />
            <AppInput v-model="planForm.currency" label="Currency" name="planCurrency" placeholder="NGN" />
            <div>
              <label class="mb-[0.8rem] block text-[1.8rem] font-[400] leading-[2.4rem] text-[#1B1B19]">
                Base price
              </label>
              <input
                v-model="planForm.baseSubscriptionPrice"
                inputmode="decimal"
                class="h-[5.6rem] w-full rounded-[10px] border border-[#D9D9D9] bg-white px-[1.8rem] text-[1.6rem] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="0"
              >
            </div>
            <AppInput
              v-model="planForm.billingPeriodUnitsText"
              label="Billing period units"
              name="billingPeriodUnits"
              hint="Comma-separated 30-day units, e.g. 1, 3, 12"
              placeholder="1, 3, 12"
            />
            <AppInput
              v-model="planForm.defaultBillingPeriodUnits"
              type="number"
              label="Default period units"
              name="defaultBillingPeriodUnits"
              placeholder="1"
            />
            <AppInput
              v-model="planForm.gracePeriodDays"
              type="number"
              label="Grace period days"
              name="gracePeriodDays"
              placeholder="7"
            />
            <AppInput
              v-model="planForm.sortOrder"
              type="number"
              label="Sort order"
              name="planSortOrder"
              placeholder="Optional"
            />
          </div>

          <BaseTextArea
            v-model="planForm.description"
            label="Description"
            name="planDescription"
            placeholder="Short admin-facing plan description"
            :rows="3"
          />

          <div class="grid grid-cols-1 gap-[1rem] md:grid-cols-2">
            <label
              class="rounded-[8px] border p-[1.2rem]"
              :class="planForm.publicVisible ? 'border-[#3CA745] bg-[#F4FFF4]' : 'border-[#EDEFF2] bg-white'"
            >
              <span class="flex items-center gap-[0.8rem] font-[700] text-[#000]">
                <input v-model="planForm.publicVisible" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Public visible
              </span>
              <span class="mt-[0.4rem] block text-[1.2rem] text-[#616161]">
                Public plans can appear in merchant-facing plan selection when active.
              </span>
            </label>

            <label
              class="rounded-[8px] border p-[1.2rem]"
              :class="planForm.adminOnly ? 'border-[#0066CC] bg-[#F0F7FF]' : 'border-[#EDEFF2] bg-white'"
            >
              <span class="flex items-center gap-[0.8rem] font-[700] text-[#000]">
                <input v-model="planForm.adminOnly" type="checkbox" class="h-[1.6rem] w-[1.6rem]">
                Admin only
              </span>
              <span class="mt-[0.4rem] block text-[1.2rem] text-[#616161]">
                Admin-only plans are hidden from normal merchant self-selection.
              </span>
            </label>
          </div>

          <div class="grid grid-cols-1 gap-[1.2rem] lg:grid-cols-2">
            <BaseTextArea v-model="planForm.featureEntitlementsJson" label="Feature entitlements JSON" :rows="5" />
            <BaseTextArea v-model="planForm.usageLimitsJson" label="Usage limits JSON" :rows="5" />
            <BaseTextArea v-model="planForm.checkoutFeePolicyJson" label="Checkout fee policy JSON" :rows="5" />
            <BaseTextArea v-model="planForm.apiUsagePolicyJson" label="API usage policy JSON" :rows="5" />
            <BaseTextArea v-model="planForm.trialPolicyJson" label="Trial policy JSON" :rows="5" />
            <BaseTextArea v-model="planForm.renewalPolicyJson" label="Renewal policy JSON" :rows="5" />
          </div>

          <p v-if="planJsonError" class="rounded-[8px] bg-red-50 p-[1rem] text-red-600">
            {{ planJsonError }}
          </p>

          <div class="flex flex-wrap justify-end gap-[1rem]">
            <BaseButton radius="8px" variant="outline" @click="showPlanModal = false">
              Cancel
            </BaseButton>
            <BaseButton type="submit" radius="8px" :loading="billingPlansStore.saving">
              {{ editingPlan ? "Update Plan" : "Create Plan" }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
