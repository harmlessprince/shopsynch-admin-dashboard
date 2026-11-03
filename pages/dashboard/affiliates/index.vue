<script setup>
import { formatDate, formatToMoney } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-affiliates",
});

useHead({
  title: "Affiliate Referral Programme - ShopSynch Admin",
});

const affiliatesStore = useAdminAffiliatesStore();

const activeTab = ref("partners");

const affiliateStatusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const commissionStatusOptions = [
  { label: "All statuses", value: "" },
  { label: "Earned (unpaid)", value: "EARNED" },
  { label: "Paid", value: "PAID" },
  { label: "Reversed", value: "REVERSED" },
];

const affiliateStatusBadge = {
  PENDING: { label: "Pending", badge: "bg-[#FFF0C2] text-[#8A5A00]" },
  APPROVED: { label: "Approved", badge: "bg-[#B5F9B4] text-[#3CA745]" },
  REJECTED: { label: "Rejected", badge: "bg-[#FFBFBF] text-[#B42318]" },
};

const commissionStatusBadge = {
  EARNED: { label: "Earned", badge: "bg-[#FFF0C2] text-[#8A5A00]" },
  PAID: { label: "Paid", badge: "bg-[#B5F9B4] text-[#3CA745]" },
  REVERSED: { label: "Reversed", badge: "bg-[#FFBFBF] text-[#B42318]" },
};

const businessAccessLabels = {
  YES: "Yes",
  A_FEW: "A few",
  NO: "No",
};

const partnersHeader = [
  { title: "Partner", accessor: "fullName" },
  { title: "Access & Occupation", accessor: "occupation" },
  { title: "Status", accessor: "status" },
  { title: "Referral Code & Rule", accessor: "referralCode" },
  { title: "Performance", accessor: "referredMerchantsCount" },
  { title: "Submitted", accessor: "createdAt" },
  { title: "Actions", accessor: "_action" },
];

const commissionsHeader = [
  { title: "Affiliate", accessor: "affiliateId" },
  { title: "Referred Merchant", accessor: "referredTenantId" },
  { title: "Payment", accessor: "paymentReference" },
  { title: "Commission", accessor: "commissionAmount" },
  { title: "Status", accessor: "status" },
  { title: "Earned", accessor: "earnedAt" },
  { title: "Actions", accessor: "_action" },
];

// Approve modal state
const approvingAffiliate = ref(null);
const approveCommissionPct = ref("");
const approveMaxPayments = ref("");

// Reject modal state
const rejectingAffiliate = ref(null);
const rejectReason = ref("");

// Mark paid modal state
const payingCommission = ref(null);
const payoutReference = ref("");
const payoutNote = ref("");

// Programme settings form state
const settingsForm = reactive({
  commissionPercentage: "10",
  maxCommissionPaymentsPerMerchant: "12",
  maxApprovedAffiliates: "20",
});

function syncSettingsForm(settingsData) {
  if (!settingsData) return;
  settingsForm.commissionPercentage = String(settingsData.commissionPercentage ?? 10);
  settingsForm.maxCommissionPaymentsPerMerchant = String(settingsData.maxCommissionPaymentsPerMerchant ?? 12);
  settingsForm.maxApprovedAffiliates = String(settingsData.maxApprovedAffiliates ?? 20);
}

function partnerStatusMeta(status) {
  return affiliateStatusBadge[status] || { label: status, badge: "bg-gray-100 text-gray-600" };
}

function commissionMeta(status) {
  return commissionStatusBadge[status] || { label: status, badge: "bg-gray-100 text-gray-600" };
}

function fieldError(errorsMap, field) {
  const value = errorsMap?.[field];
  if (!value) return "";
  return Array.isArray(value) ? value.join(" ") : String(value);
}

function openApproveModal(affiliate) {
  approvingAffiliate.value = affiliate;
  approveCommissionPct.value = String(affiliatesStore.settings?.commissionPercentage ?? 10);
  approveMaxPayments.value = String(affiliatesStore.settings?.maxCommissionPaymentsPerMerchant ?? 12);
  affiliatesStore.actionErrors = {};
}

async function submitApprove() {
  if (!approvingAffiliate.value) return;
  const payload = {};
  if (approveCommissionPct.value !== "") {
    payload.commissionPercentage = Number(approveCommissionPct.value);
  }
  if (approveMaxPayments.value !== "") {
    payload.maxCommissionPaymentsPerMerchant = Number(approveMaxPayments.value);
  }
  const updated = await affiliatesStore.approveAffiliate(approvingAffiliate.value.id, payload);
  if (updated) {
    approvingAffiliate.value = null;
  }
}

function openRejectModal(affiliate) {
  rejectingAffiliate.value = affiliate;
  rejectReason.value = "";
  affiliatesStore.actionErrors = {};
}

async function submitReject() {
  if (!rejectingAffiliate.value) return;
  const updated = await affiliatesStore.rejectAffiliate(rejectingAffiliate.value.id, rejectReason.value);
  if (updated) {
    rejectingAffiliate.value = null;
  }
}

function openMarkPaidModal(entry) {
  payingCommission.value = entry;
  payoutReference.value = "";
  payoutNote.value = "";
  affiliatesStore.actionErrors = {};
}

async function submitMarkPaid() {
  if (!payingCommission.value) return;
  const updated = await affiliatesStore.markCommissionPaid(payingCommission.value.id, {
    payoutReference: payoutReference.value,
    payoutNote: payoutNote.value,
  });
  if (updated) {
    payingCommission.value = null;
    await affiliatesStore.fetchAffiliates();
  }
}

async function saveProgrammeSettings() {
  const saved = await affiliatesStore.updateSettings({
    commissionPercentage: Number(settingsForm.commissionPercentage),
    maxCommissionPaymentsPerMerchant: Number(settingsForm.maxCommissionPaymentsPerMerchant),
    maxApprovedAffiliates: Number(settingsForm.maxApprovedAffiliates),
  });
  if (saved) {
    syncSettingsForm(saved);
  }
}

function filterCommissionsByAffiliate(affiliateId) {
  activeTab.value = "commissions";
  affiliatesStore.fetchCommissions({ page: 0, affiliateId });
}

onMounted(async () => {
  const loadedSettings = await affiliatesStore.fetchSettings();
  syncSettingsForm(loadedSettings);
  await Promise.all([
    affiliatesStore.fetchAffiliates({ page: 0 }),
    affiliatesStore.fetchCommissions({ page: 0 }),
  ]);
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-[2rem] font-[700] text-[#000]">Affiliate Referral Programme</h1>
          <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
            Review partner applications from <span class="font-[600]">referral.shopsynch.com</span>, issue referral
            codes, configure the commission percentage and payment limit, and mark earned commissions as paid.
          </p>
        </div>
        <div v-if="affiliatesStore.settings" class="flex flex-wrap gap-[1.2rem]">
          <div class="rounded-[8px] border border-[#E0E0E0] px-[1.4rem] py-[0.8rem]">
            <p class="text-[1.1rem] uppercase text-[#616161]">Commission Rate</p>
            <p class="text-[1.8rem] font-[700] text-primary">{{ affiliatesStore.settings.commissionPercentage }}%</p>
          </div>
          <div class="rounded-[8px] border border-[#E0E0E0] px-[1.4rem] py-[0.8rem]">
            <p class="text-[1.1rem] uppercase text-[#616161]">Eligible Payments (N)</p>
            <p class="text-[1.8rem] font-[700] text-primary">
              First {{ affiliatesStore.settings.maxCommissionPaymentsPerMerchant }}
            </p>
          </div>
          <div class="rounded-[8px] border border-[#E0E0E0] px-[1.4rem] py-[0.8rem]">
            <p class="text-[1.1rem] uppercase text-[#616161]">Approved Cohort</p>
            <p class="text-[1.8rem] font-[700] text-primary">
              {{ affiliatesStore.settings.approvedAffiliatesCount }} / {{ affiliatesStore.settings.maxApprovedAffiliates }}
            </p>
          </div>
        </div>
      </div>

      <div class="mt-[1.6rem] flex flex-wrap gap-[0.8rem] border-t border-[#EDEFF2] pt-[1.6rem]">
        <BaseButton
          size="sm"
          radius="8px"
          :variant="activeTab === 'partners' ? 'primary' : 'outline'"
          @click="activeTab = 'partners'"
        >
          Applications & Partners ({{ affiliatesStore.affiliatesTotalElements }})
        </BaseButton>
        <BaseButton
          size="sm"
          radius="8px"
          :variant="activeTab === 'commissions' ? 'primary' : 'outline'"
          @click="activeTab = 'commissions'"
        >
          Commission Ledger ({{ affiliatesStore.commissionsTotalElements }})
        </BaseButton>
        <BaseButton
          size="sm"
          radius="8px"
          :variant="activeTab === 'settings' ? 'primary' : 'outline'"
          @click="activeTab = 'settings'"
        >
          Programme Settings
        </BaseButton>
      </div>
    </section>

    <!-- Applications & Partners Tab -->
    <template v-if="activeTab === 'partners'">
      <section class="rounded-[8px] bg-white p-[1.6rem] shadow-sm">
        <div class="flex flex-col gap-[1.2rem] sm:flex-row sm:items-end sm:justify-between">
          <div class="w-full sm:w-[24rem]">
            <BaseSelectInput
              :model-value="affiliatesStore.affiliateStatusFilter"
              :options="affiliateStatusOptions"
              label="Filter by status"
              @update:model-value="affiliatesStore.fetchAffiliates({ page: 0, status: $event })"
            />
          </div>
          <BaseButton
            size="sm"
            radius="8px"
            variant="outline"
            :loading="affiliatesStore.affiliatesLoading"
            @click="affiliatesStore.fetchAffiliates({ page: affiliatesStore.affiliatesPage })"
          >
            Reload
          </BaseButton>
        </div>
      </section>

      <p v-if="affiliatesStore.affiliatesError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
        {{ affiliatesStore.affiliatesError }}
      </p>

      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <DataTable
          :table-header="partnersHeader"
          :table-data="affiliatesStore.affiliates"
          :loading="affiliatesStore.affiliatesLoading"
          pagination-type="cursor"
          :has-prev="affiliatesStore.hasPrevAffiliates"
          :has-next="affiliatesStore.hasNextAffiliates"
          :current-page="affiliatesStore.affiliatesPage + 1"
          :current-limit="affiliatesStore.affiliatesSize"
          empty-state-title="No affiliate applications yet"
          empty-state-description="Applications submitted from referral.shopsynch.com will appear here."
          @prev="affiliatesStore.fetchAffiliates({ page: affiliatesStore.affiliatesPage - 1 })"
          @next="affiliatesStore.fetchAffiliates({ page: affiliatesStore.affiliatesPage + 1 })"
          @change-limit="affiliatesStore.fetchAffiliates({ page: 0, size: $event })"
        >
          <template #cell(fullName)="{ row }">
            <p class="font-[700] text-[#121212]">{{ row.fullName }}</p>
            <p class="text-[1.2rem] text-[#616161]">{{ row.email }}</p>
            <p class="text-[1.2rem] text-[#616161]">{{ row.phoneNumber }}</p>
          </template>

          <template #cell(occupation)="{ row }">
            <p class="text-[#121212]">{{ row.occupation || "Not specified" }}</p>
            <p class="text-[1.2rem] text-[#616161]">
              Business access: <span class="font-[600]">{{ businessAccessLabels[row.businessAccess] || row.businessAccess }}</span>
            </p>
          </template>

          <template #cell(status)="{ row }">
            <span
              :class="partnerStatusMeta(row.status).badge"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            >
              {{ partnerStatusMeta(row.status).label }}
            </span>
            <p v-if="row.rejectionReason" class="mt-[0.3rem] max-w-[22rem] whitespace-normal text-[1.2rem] text-[#B42318]">
              {{ row.rejectionReason }}
            </p>
          </template>

          <template #cell(referralCode)="{ row }">
            <template v-if="row.referralCode">
              <p class="font-mono font-[700] text-primary">{{ row.referralCode }}</p>
              <p class="text-[1.2rem] text-[#616161]">
                {{ row.commissionPercentage }}% · first {{ row.maxCommissionPaymentsPerMerchant }} payments
              </p>
            </template>
            <span v-else class="text-[#9CA3AF]">&mdash;</span>
          </template>

          <template #cell(referredMerchantsCount)="{ row }">
            <p class="font-[600] text-[#121212]">{{ row.referredMerchantsCount || 0 }} referred</p>
            <p class="text-[1.2rem] text-[#616161]">
              Earned: {{ formatToMoney(row.totalCommissionEarned || 0) }} · Paid: {{ formatToMoney(row.totalCommissionPaid || 0) }}
            </p>
          </template>

          <template #cell(createdAt)="{ row }">
            {{ row.createdAt ? formatDate(row.createdAt) : "N/A" }}
          </template>

          <template #cell(_action)="{ row }">
            <div class="flex flex-wrap gap-[0.6rem]">
              <template v-if="row.status === 'PENDING'">
                <BaseButton
                  size="sm"
                  radius="8px"
                  variant="primary"
                  :loading="affiliatesStore.actingAffiliateId === row.id"
                  @click="openApproveModal(row)"
                >
                  Approve
                </BaseButton>
                <BaseButton
                  size="sm"
                  radius="8px"
                  variant="danger"
                  :loading="affiliatesStore.actingAffiliateId === row.id"
                  @click="openRejectModal(row)"
                >
                  Reject
                </BaseButton>
              </template>
              <BaseButton
                v-else-if="row.status === 'APPROVED'"
                size="sm"
                radius="8px"
                variant="outline"
                @click="filterCommissionsByAffiliate(row.id)"
              >
                View Commissions
              </BaseButton>
              <span v-else class="text-[#9CA3AF]">&mdash;</span>
            </div>
          </template>
        </DataTable>
      </section>
    </template>

    <!-- Commission Ledger Tab -->
    <template v-else-if="activeTab === 'commissions'">
      <section class="rounded-[8px] bg-white p-[1.6rem] shadow-sm">
        <div class="flex flex-col gap-[1.2rem] sm:flex-row sm:items-end sm:justify-between">
          <div class="flex flex-wrap items-end gap-[1.2rem]">
            <div class="w-[22rem]">
              <BaseSelectInput
                :model-value="affiliatesStore.commissionStatusFilter"
                :options="commissionStatusOptions"
                label="Filter by status"
                @update:model-value="affiliatesStore.fetchCommissions({ page: 0, status: $event })"
              />
            </div>
            <BaseButton
              v-if="affiliatesStore.commissionAffiliateIdFilter"
              size="sm"
              radius="8px"
              variant="outline"
              @click="affiliatesStore.fetchCommissions({ page: 0, affiliateId: '' })"
            >
              Clear Affiliate Filter ({{ affiliatesStore.commissionAffiliateIdFilter }})
            </BaseButton>
          </div>
          <BaseButton
            size="sm"
            radius="8px"
            variant="outline"
            :loading="affiliatesStore.commissionsLoading"
            @click="affiliatesStore.fetchCommissions({ page: affiliatesStore.commissionsPage })"
          >
            Reload
          </BaseButton>
        </div>
      </section>

      <p v-if="affiliatesStore.commissionsError" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
        {{ affiliatesStore.commissionsError }}
      </p>

      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <DataTable
          :table-header="commissionsHeader"
          :table-data="affiliatesStore.commissions"
          :loading="affiliatesStore.commissionsLoading"
          pagination-type="cursor"
          :has-prev="affiliatesStore.hasPrevCommissions"
          :has-next="affiliatesStore.hasNextCommissions"
          :current-page="affiliatesStore.commissionsPage + 1"
          :current-limit="affiliatesStore.commissionsSize"
          empty-state-title="No commissions recorded yet"
          empty-state-description="Commissions appear automatically when a referred merchant pays for a subscription."
          @prev="affiliatesStore.fetchCommissions({ page: affiliatesStore.commissionsPage - 1 })"
          @next="affiliatesStore.fetchCommissions({ page: affiliatesStore.commissionsPage + 1 })"
          @change-limit="affiliatesStore.fetchCommissions({ page: 0, size: $event })"
        >
          <template #cell(affiliateId)="{ row }">
            <span class="font-mono text-[1.2rem] text-[#121212]">{{ row.affiliateId }}</span>
          </template>

          <template #cell(referredTenantId)="{ row }">
            <NuxtLink :to="`/dashboard/merchants/${row.referredTenantId}`" class="font-[700] text-primary hover:underline">
              {{ row.referredTenantId }}
            </NuxtLink>
            <p class="text-[1.2rem] text-[#616161]">Payment #{{ row.paymentSequenceNumber }}</p>
          </template>

          <template #cell(paymentReference)="{ row }">
            <p class="font-[600] text-[#121212]">{{ formatToMoney(row.paymentAmount) }}</p>
            <p class="text-[1.2rem] text-[#616161]">{{ row.paymentReference }}</p>
          </template>

          <template #cell(commissionAmount)="{ row }">
            <p class="font-[700] text-primary">{{ formatToMoney(row.commissionAmount) }}</p>
            <p class="text-[1.2rem] text-[#616161]">{{ row.commissionPercentage }}%</p>
          </template>

          <template #cell(status)="{ row }">
            <span
              :class="commissionMeta(row.status).badge"
              class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
            >
              {{ commissionMeta(row.status).label }}
            </span>
            <p v-if="row.payoutReference" class="mt-[0.3rem] text-[1.2rem] text-[#616161]">
              Ref: {{ row.payoutReference }}
            </p>
            <p v-if="row.reversalReason" class="mt-[0.3rem] max-w-[20rem] whitespace-normal text-[1.2rem] text-[#B42318]">
              {{ row.reversalReason }}
            </p>
          </template>

          <template #cell(earnedAt)="{ row }">
            <p>{{ row.earnedAt ? formatDate(row.earnedAt) : "N/A" }}</p>
            <p v-if="row.paidAt" class="text-[1.2rem] text-[#616161]">Paid {{ formatDate(row.paidAt) }}</p>
          </template>

          <template #cell(_action)="{ row }">
            <BaseButton
              v-if="row.status === 'EARNED'"
              size="sm"
              radius="8px"
              variant="primary"
              :loading="affiliatesStore.payingEntryId === row.id"
              @click="openMarkPaidModal(row)"
            >
              Mark Paid
            </BaseButton>
            <span v-else class="text-[#9CA3AF]">&mdash;</span>
          </template>
        </DataTable>
      </section>
    </template>

    <!-- Programme Settings Tab -->
    <template v-else-if="activeTab === 'settings'">
      <section class="max-w-[64rem] rounded-[8px] bg-white p-[2.4rem] shadow-sm">
        <h2 class="text-[1.8rem] font-[700] text-[#000]">Default Programme Settings</h2>
        <p class="mt-[0.4rem] text-[#616161]">
          These defaults apply to newly approved affiliate partners and merchant referrals. Existing referrals keep the
          commission percentage and payment limit that were active when the merchant signed up.
        </p>

        <form class="mt-[2rem] space-y-[1.6rem]" @submit.prevent="saveProgrammeSettings">
          <AppInput
            v-model="settingsForm.commissionPercentage"
            name="commissionPercentage"
            type="number"
            label="Default Commission Percentage (%)"
            placeholder="10"
            :error="fieldError(affiliatesStore.settingsErrors, 'commissionPercentage')"
          />

          <AppInput
            v-model="settingsForm.maxCommissionPaymentsPerMerchant"
            name="maxCommissionPaymentsPerMerchant"
            type="number"
            label="Maximum Commissioned Subscription Payments per Merchant (N)"
            placeholder="12"
            :error="fieldError(affiliatesStore.settingsErrors, 'maxCommissionPaymentsPerMerchant')"
          />

          <AppInput
            v-model="settingsForm.maxApprovedAffiliates"
            name="maxApprovedAffiliates"
            type="number"
            label="Maximum Approved Affiliate Partners (Cohort Cap)"
            placeholder="20"
            :error="fieldError(affiliatesStore.settingsErrors, 'maxApprovedAffiliates')"
          />

          <div class="pt-[0.8rem]">
            <BaseButton type="submit" radius="8px" variant="primary" :loading="affiliatesStore.settingsSaving">
              Save Settings
            </BaseButton>
          </div>
        </form>
      </section>
    </template>

    <!-- Approve Affiliate Modal -->
    <div
      v-if="approvingAffiliate"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-[1.6rem]"
    >
      <div class="w-full max-w-[48rem] rounded-[10px] bg-white p-[2.4rem] shadow-lg">
        <h3 class="text-[1.8rem] font-[700] text-[#121212]">Approve {{ approvingAffiliate.fullName }}</h3>
        <p class="mt-[0.4rem] text-[#616161]">
          Approving reserves one cohort slot and generates a unique <span class="font-mono font-[600]">AFFxxxxx</span>
          referral code. You can keep the programme defaults or override them for this partner.
        </p>
        <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="submitApprove">
          <AppInput
            v-model="approveCommissionPct"
            name="approveCommissionPercentage"
            type="number"
            label="Commission Percentage (%)"
            :error="fieldError(affiliatesStore.actionErrors, 'commissionPercentage')"
          />
          <AppInput
            v-model="approveMaxPayments"
            name="approveMaxCommissionPayments"
            type="number"
            label="Max Commissioned Payments per Merchant (N)"
            :error="fieldError(affiliatesStore.actionErrors, 'maxCommissionPaymentsPerMerchant')"
          />
          <div class="flex justify-end gap-[1rem] pt-[1rem]">
            <BaseButton radius="8px" variant="outline" @click="approvingAffiliate = null">Cancel</BaseButton>
            <BaseButton
              type="submit"
              radius="8px"
              variant="primary"
              :loading="affiliatesStore.actingAffiliateId === approvingAffiliate.id"
            >
              Approve & Generate Code
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Reject Affiliate Modal -->
    <div
      v-if="rejectingAffiliate"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-[1.6rem]"
    >
      <div class="w-full max-w-[48rem] rounded-[10px] bg-white p-[2.4rem] shadow-lg">
        <h3 class="text-[1.8rem] font-[700] text-[#121212]">Reject {{ rejectingAffiliate.fullName }}</h3>
        <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="submitReject">
          <BaseTextArea
            v-model="rejectReason"
            name="reason"
            label="Rejection Reason"
            placeholder="Explain why this application is being rejected"
            :maxlength="500"
            :error="fieldError(affiliatesStore.actionErrors, 'reason')"
          />
          <div class="flex justify-end gap-[1rem] pt-[1rem]">
            <BaseButton radius="8px" variant="outline" @click="rejectingAffiliate = null">Cancel</BaseButton>
            <BaseButton
              type="submit"
              radius="8px"
              variant="danger"
              :loading="affiliatesStore.actingAffiliateId === rejectingAffiliate.id"
            >
              Reject Application
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <!-- Mark Commission Paid Modal -->
    <div
      v-if="payingCommission"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-[1.6rem]"
    >
      <div class="w-full max-w-[48rem] rounded-[10px] bg-white p-[2.4rem] shadow-lg">
        <h3 class="text-[1.8rem] font-[700] text-[#121212]">Mark Commission as Paid</h3>
        <p class="mt-[0.4rem] text-[#616161]">
          Amount: <span class="font-[700] text-[#121212]">{{ formatToMoney(payingCommission.commissionAmount) }}</span>
          (Payment {{ payingCommission.paymentReference }})
        </p>
        <form class="mt-[1.6rem] space-y-[1.4rem]" @submit.prevent="submitMarkPaid">
          <AppInput
            v-model="payoutReference"
            name="payoutReference"
            type="text"
            label="Payout Reference (optional)"
            placeholder="Bank transfer reference"
            :error="fieldError(affiliatesStore.actionErrors, 'payoutReference')"
          />
          <BaseTextArea
            v-model="payoutNote"
            name="payoutNote"
            label="Payout Note (optional)"
            placeholder="Optional note about the manual payout"
            :maxlength="500"
            :error="fieldError(affiliatesStore.actionErrors, 'payoutNote')"
          />
          <div class="flex justify-end gap-[1rem] pt-[1rem]">
            <BaseButton radius="8px" variant="outline" @click="payingCommission = null">Cancel</BaseButton>
            <BaseButton
              type="submit"
              radius="8px"
              variant="primary"
              :loading="affiliatesStore.payingEntryId === payingCommission.id"
            >
              Confirm Paid
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
