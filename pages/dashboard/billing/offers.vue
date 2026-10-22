<script setup>
import { formatDate } from "~/utils/helpers.js";
import DataTable from "~/components/table/DataTable.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-billing-offers",
});

useHead({
  title: "Pricing Offers - ShopSynch Admin",
});

const offersStore = useAdminBillingOffersStore();

const statusMeta = {
  DRAFT: { label: "Draft", badge: "bg-[#F3F4F6] text-[#6B7280]" },
  ACTIVE: { label: "Active", badge: "bg-[#B5F9B4] text-[#3CA745]" },
  PAUSED: { label: "Paused", badge: "bg-[#FFF0C2] text-[#8A5A00]" },
  ENDED: { label: "Ended", badge: "bg-[#FFBFBF] text-[#B42318]" },
};

// What each lifecycle action does, shown in the confirm dialog. Resume doubles as "activate" for a draft.
const actionCopy = {
  pause: {
    title: "Pause this offer?",
    body: "New stores can no longer redeem it. Stores that already redeemed keep their trial and locked price.",
    confirm: "Pause offer",
  },
  resume: {
    title: "Open this offer?",
    body: "New stores can redeem it again, within its dates and while slots remain.",
    confirm: "Open offer",
  },
  end: {
    title: "End this offer for good?",
    body: "It cannot be reopened. Stores that already redeemed keep their trial and locked price.",
    confirm: "End offer",
  },
};

const tableHeader = [
  { title: "Offer", accessor: "name" },
  { title: "Status", accessor: "status" },
  { title: "Slots", accessor: "redemptionCount" },
  { title: "Window", accessor: "endsAt" },
  { title: "Details", accessor: "_action" },
];

const redemptionHeader = [
  { title: "Store", accessor: "tenantId" },
  { title: "Plan", accessor: "planCode" },
  { title: "Redeemed", accessor: "redeemedAt" },
  { title: "Setup call", accessor: "setupCallCompleted" },
  { title: "Review", accessor: "reviewReceived" },
  { title: "Notes", accessor: "commitmentNotes" },
];

const plansStore = useAdminBillingPlansStore();

const showForm = ref(false);
const editingOffer = ref(null);
const pendingAction = ref(null); // { action, offer }
const noteDrafts = ref({});

const offer = computed(() => offersStore.selectedOffer);

const availableActions = computed(() => {
  switch (offer.value?.status) {
    case "DRAFT": return [{ action: "resume", label: "Activate" }, { action: "end", label: "End" }];
    case "ACTIVE": return [{ action: "pause", label: "Pause" }, { action: "end", label: "End" }];
    case "PAUSED": return [{ action: "resume", label: "Resume" }, { action: "end", label: "End" }];
    default: return [];
  }
});

const confirmCopy = computed(() => (pendingAction.value ? actionCopy[pendingAction.value.action] : null));

function meta(status) {
  return statusMeta[status] || { label: status, badge: "bg-gray-100 text-gray-600" };
}

function formatMoney(amount, currency = "NGN") {
  return `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;
}

function slotsLabel(row) {
  return row.maxRedemptions == null
    ? `${row.redemptionCount} redeemed · unlimited`
    : `${row.redemptionCount} of ${row.maxRedemptions} redeemed`;
}

function windowLabel(row) {
  const from = row.startsAt ? formatDate(row.startsAt) : "any time";
  const to = row.endsAt ? formatDate(row.endsAt) : "no end date";
  return `${from} to ${to}`;
}

async function openForm(target = null) {
  editingOffer.value = target;
  showForm.value = true;
  if (!plansStore.plans.length) await plansStore.fetchPlans();
}

async function submitForm(payload) {
  const saved = await offersStore.saveOffer(payload, editingOffer.value?.code);
  if (!saved) return;
  showForm.value = false;
  if (!editingOffer.value) await offersStore.selectOffer(saved.code);
}

function askConfirm(action) {
  pendingAction.value = { action, offer: offer.value };
}

async function confirmAction() {
  const { action, offer: target } = pendingAction.value;
  const actions = { pause: offersStore.pauseOffer, resume: offersStore.resumeOffer, end: offersStore.endOffer };
  const updated = await actions[action](target.code);
  if (updated) pendingAction.value = null;
}

function noteDraft(row) {
  return noteDrafts.value[row.tenantId] ?? row.commitmentNotes ?? "";
}

function noteChanged(row) {
  return noteDraft(row) !== (row.commitmentNotes ?? "");
}

function toggleCommitment(row, field, event) {
  offersStore.updateCommitments(offer.value.code, row.tenantId, { [field]: event.target.checked });
}

async function saveNote(row) {
  const updated = await offersStore.updateCommitments(offer.value.code, row.tenantId, { notes: noteDraft(row) });
  if (updated) {
    const { [row.tenantId]: _saved, ...remaining } = noteDrafts.value;
    noteDrafts.value = remaining;
  }
}

onMounted(async () => {
  await offersStore.fetchOffers();
  if (!offersStore.selectedCode && offersStore.offers.length) {
    offersStore.selectOffer(offersStore.offers[0].code);
  }
});
</script>

<template>
  <div class="space-y-[1.6rem] text-[1.4rem] text-dashboard_text_color">
    <section class="rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-col gap-[1.6rem] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <NuxtLink to="/dashboard/billing/plans" class="text-[1.3rem] font-[600] text-primary hover:underline">
            &larr; Billing plans
          </NuxtLink>
          <h1 class="mt-[0.4rem] text-[2rem] font-[700] text-[#000]">Pricing Offers</h1>
          <p class="mt-[0.4rem] max-w-[84rem] text-[#616161]">
            Campaigns such as Founding Merchants. An offer can extend the trial, charge a locked price and grant perks
            to the stores that redeem it. Pausing or ending an offer never changes what a store already redeemed.
          </p>
        </div>
        <div class="flex gap-[1rem]">
          <BaseButton radius="8px" variant="outline" :loading="offersStore.loading" @click="offersStore.fetchOffers()">
            Reload
          </BaseButton>
          <BaseButton radius="8px" class="whitespace-nowrap" @click="openForm()">New offer</BaseButton>
        </div>
      </div>
    </section>

    <p v-if="offersStore.error" class="rounded-[8px] bg-[#FFBFBF] p-[1.2rem] font-[600] text-[#B42318]">
      {{ offersStore.error }}
    </p>

    <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
      <DataTable
        :table-header="tableHeader"
        :table-data="offersStore.offers"
        :loading="offersStore.loading"
        :has-pagination="false"
        empty-state-title="No pricing offers"
        empty-state-description="No offer has been created yet."
      >
        <template #cell(name)="{ row }">
          <p class="font-[700] text-[#000]">{{ row.name }}</p>
          <p class="text-[1.2rem] text-[#616161]">{{ row.code }}</p>
        </template>

        <template #cell(status)="{ row }">
          <span
            :class="meta(row.status).badge"
            class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
          >
            {{ meta(row.status).label }}
          </span>
          <p class="mt-[0.3rem] text-[1.2rem] text-[#616161]">
            {{ row.publicVisible ? "Shown on the pricing page" : "Hidden from the pricing page" }}
          </p>
        </template>

        <template #cell(redemptionCount)="{ row }">
          {{ slotsLabel(row) }}
          <p v-if="row.slotsRemaining != null" class="text-[1.2rem] text-[#616161]">
            {{ row.slotsRemaining }} slot{{ row.slotsRemaining === 1 ? "" : "s" }} left
          </p>
        </template>

        <template #cell(endsAt)="{ row }">
          <span class="whitespace-normal">{{ windowLabel(row) }}</span>
        </template>

        <template #cell(_action)="{ row }">
          <BaseButton
            size="sm"
            radius="8px"
            :variant="offersStore.selectedCode === row.code ? 'primary' : 'outline'"
            @click="offersStore.selectOffer(row.code)"
          >
            {{ offersStore.selectedCode === row.code ? "Selected" : "View" }}
          </BaseButton>
        </template>
      </DataTable>
    </section>

    <template v-if="offer">
      <section class="rounded-[8px] bg-white p-[2rem] shadow-sm" data-testid="offer-detail">
        <div class="flex flex-col gap-[1.2rem] lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="flex items-center gap-[1rem]">
              <h2 class="text-[1.8rem] font-[800] text-[#000]">{{ offer.name }}</h2>
              <span
                :class="meta(offer.status).badge"
                class="inline-flex items-center rounded-full px-[1rem] py-[0.3rem] text-[1.2rem] font-[600]"
              >
                {{ meta(offer.status).label }}
              </span>
            </div>
            <p class="mt-[0.3rem] text-[1.2rem] text-[#616161]">{{ offer.code }}</p>
            <p v-if="offer.description" class="mt-[0.8rem] max-w-[80rem] text-[#616161]">{{ offer.description }}</p>
          </div>
          <div class="flex flex-wrap gap-[1rem]">
            <BaseButton
              v-if="offer.status !== 'ENDED'"
              radius="8px"
              variant="outline"
              class="whitespace-nowrap"
              @click="openForm(offer)"
            >
              Edit
            </BaseButton>
            <BaseButton
              v-for="item in availableActions"
              :key="item.action"
              radius="8px"
              :variant="item.action === 'end' ? 'danger' : 'outline'"
              class="whitespace-nowrap"
              :loading="offersStore.actingCode === offer.code"
              @click="askConfirm(item.action)"
            >
              {{ item.label }}
            </BaseButton>
          </div>
        </div>

        <dl class="mt-[2rem] grid gap-[1.2rem] sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-[8px] bg-[#FAFAFA] p-[1.2rem]">
            <dt class="text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">Slots</dt>
            <dd class="mt-[0.3rem] font-[700] text-[#000]">{{ slotsLabel(offer) }}</dd>
            <dd v-if="offer.slotsRemaining != null" class="text-[1.2rem] text-[#616161]">{{ offer.slotsRemaining }} left</dd>
          </div>
          <div class="rounded-[8px] bg-[#FAFAFA] p-[1.2rem]">
            <dt class="text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">Window</dt>
            <dd class="mt-[0.3rem] font-[700] text-[#000]">{{ windowLabel(offer) }}</dd>
            <dd class="text-[1.2rem] text-[#616161]">Whichever comes first closes it: the cap or the end date.</dd>
          </div>
          <div class="rounded-[8px] bg-[#FAFAFA] p-[1.2rem]">
            <dt class="text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">Trial</dt>
            <dd class="mt-[0.3rem] font-[700] text-[#000]">
              {{ offer.trialDays ? `${offer.trialDays} days` : "Plan default" }}
            </dd>
          </div>
          <div class="rounded-[8px] bg-[#FAFAFA] p-[1.2rem]">
            <dt class="text-[1.2rem] font-[700] uppercase tracking-wide text-[#616161]">Eligible plans</dt>
            <dd class="mt-[0.3rem] flex flex-wrap gap-[0.6rem]">
              <span
                v-for="code in offer.eligiblePlanCodes"
                :key="code"
                class="rounded-full bg-white px-[1rem] py-[0.2rem] text-[1.2rem] font-[600] text-[#335C85] border border-[#D0E8FF]"
              >
                {{ code }}
              </span>
            </dd>
          </div>
        </dl>

        <div class="mt-[2rem] grid gap-[2rem] lg:grid-cols-2">
          <div>
            <h3 class="text-[1.5rem] font-[700] text-[#000]">Price overrides</h3>
            <ul v-if="offer.priceOverrides?.length" class="mt-[0.8rem] space-y-[0.6rem]">
              <li
                v-for="override in offer.priceOverrides"
                :key="`${override.planCode}-${override.periodUnitCount}`"
                class="flex items-center justify-between rounded-[8px] border border-[#EDEFF2] p-[1rem]"
              >
                <span>
                  <strong>{{ override.planCode }}</strong>, {{ override.periodUnitCount }} x 30 days
                </span>
                <span class="font-[700]">
                  {{ formatMoney(override.amount, override.currency) }}
                  <span v-if="override.lockedForLife" class="ml-[0.6rem] rounded-full bg-[#F4E8FF] px-[0.8rem] py-[0.1rem] text-[1.1rem] text-[#6D28D9]">
                    locked for life
                  </span>
                </span>
              </li>
            </ul>
            <p v-else class="mt-[0.8rem] text-[#616161]">No price overrides. Redeeming stores pay list price.</p>
          </div>
          <div>
            <h3 class="text-[1.5rem] font-[700] text-[#000]">Perks</h3>
            <ul v-if="offer.perks?.length" class="mt-[0.8rem] space-y-[0.6rem]">
              <li
                v-for="perk in offer.perks"
                :key="perk.perkCode"
                class="rounded-[8px] border border-[#EDEFF2] p-[1rem]"
              >
                <strong>{{ perk.perkCode }}</strong><span v-if="perk.quantity"> x {{ perk.quantity }}</span>
                <p v-if="perk.description" class="text-[1.2rem] text-[#616161]">{{ perk.description }}</p>
              </li>
            </ul>
            <p v-else class="mt-[0.8rem] text-[#616161]">This offer grants no perks.</p>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-[8px] bg-white shadow-sm">
        <div class="border-b border-[#EDEFF2] p-[2rem]">
          <h2 class="text-[1.8rem] font-[800] text-[#000]">Redemptions</h2>
          <p class="mt-[0.4rem] max-w-[80rem] text-[#616161]">
            Stores that redeemed {{ offer.name }}. The setup call and review flags are for tracking only and never
            block or revoke the offer or its locked price.
          </p>
        </div>
        <DataTable
          :table-header="redemptionHeader"
          :table-data="offersStore.redemptions"
          :loading="offersStore.loadingRedemptions"
          :has-pagination="false"
          empty-state-title="No redemptions yet"
          empty-state-description="No store has redeemed this offer."
        >
          <template #cell(tenantId)="{ row }">
            <NuxtLink :to="`/dashboard/merchants/${row.tenantId}`" class="font-[700] text-primary hover:underline">
              {{ row.tenantId }}
            </NuxtLink>
          </template>

          <template #cell(redeemedAt)="{ row }">
            {{ row.redeemedAt ? formatDate(row.redeemedAt) : "N/A" }}
          </template>

          <!-- TODO: replace with a shared checkbox component if one is added; none exists in components/ today. -->
          <template #cell(setupCallCompleted)="{ row }">
            <input
              type="checkbox"
              class="h-[1.8rem] w-[1.8rem] accent-primary"
              :checked="row.setupCallCompleted"
              :disabled="offersStore.savingTenantId === row.tenantId"
              :aria-label="`Setup call completed for ${row.tenantId}`"
              @change="toggleCommitment(row, 'setupCallCompleted', $event)"
            >
          </template>

          <template #cell(reviewReceived)="{ row }">
            <input
              type="checkbox"
              class="h-[1.8rem] w-[1.8rem] accent-primary"
              :checked="row.reviewReceived"
              :disabled="offersStore.savingTenantId === row.tenantId"
              :aria-label="`Review received from ${row.tenantId}`"
              @change="toggleCommitment(row, 'reviewReceived', $event)"
            >
          </template>

          <template #cell(commitmentNotes)="{ row }">
            <div class="flex min-w-[24rem] items-center gap-[0.8rem]">
              <div class="flex-1">
                <AppInput
                  :model-value="noteDraft(row)"
                  placeholder="Add a note"
                  @update:model-value="noteDrafts[row.tenantId] = $event"
                />
              </div>
              <BaseButton
                v-if="noteChanged(row)"
                size="sm"
                radius="8px"
                :loading="offersStore.savingTenantId === row.tenantId"
                @click="saveNote(row)"
              >
                Save
              </BaseButton>
            </div>
          </template>
        </DataTable>
      </section>
    </template>

    <DashboardPricingOfferFormModal
      :open="showForm"
      :offer="editingOffer"
      :plans="plansStore.plans.filter((plan) => plan.status === 'ACTIVE')"
      :saving="offersStore.saving"
      :errors="offersStore.formErrors"
      @close="showForm = false"
      @submit="submitForm"
    />

    <div
      v-if="pendingAction"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-[1.6rem]"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-[44rem] rounded-[12px] border border-slate-200 bg-white p-[2.4rem] shadow-xl">
        <h3 class="text-[1.8rem] font-[700] text-slate-900">{{ confirmCopy.title }}</h3>
        <p class="mt-[1.2rem] text-[1.4rem] leading-relaxed text-slate-600">
          <strong>{{ pendingAction.offer.name }}</strong>. {{ confirmCopy.body }}
        </p>
        <div class="mt-[2.4rem] flex justify-end gap-[1.2rem]">
          <BaseButton radius="8px" variant="outline" :disabled="Boolean(offersStore.actingCode)" @click="pendingAction = null">
            Cancel
          </BaseButton>
          <BaseButton
            radius="8px"
            bold
            :variant="pendingAction.action === 'end' ? 'danger' : 'primary'"
            :loading="Boolean(offersStore.actingCode)"
            @click="confirmAction"
          >
            {{ confirmCopy.confirm }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
