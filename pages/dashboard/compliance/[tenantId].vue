<script setup>
import { logger, formatDate } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-compliance-detail",
  fluid: true,
});

const route = useRoute();
const router = useRouter();
const store = useAdminComplianceStore();
const toastStore = useToastStore();

const tenantId = route.params.tenantId;

// Flagged fields: key = "sectionId.fieldKey", value = { flagged, field, label, note }
const flags = ref({});

// Document viewer
const activeDoc = ref(null);
const activeDocTitle = ref("");
const docZoom = ref(1);
const docRotation = ref(0);

// Modals
const showRejectModal = ref(false);
const showOverrideModal = ref(false);

// Forms
const rejectForm = ref({ rejectionCode: "", globalNote: "" });
const overrideForm = ref({ reason: "", expiresAt: "" });

// Action loading (separate from detail loading)
const actionLoading = ref(false);

// Per-document review state (keyed by documentType)
const docReviewLoading = ref({});
const docRejectNote = ref({});
const showDocRejectInput = ref({});

const detail = computed(() => store.detail);

const hasFlaggedFields = computed(() => Object.values(flags.value).some((f) => f.flagged));

const fieldErrors = computed(() =>
  Object.entries(flags.value)
    .filter(([, v]) => v.flagged)
    .map(([, v]) => ({
      field: v.field,
      label: v.label,
      note: v.note?.trim() || "",
    }))
);

const flaggedNotes = computed(() =>
  fieldErrors.value
    .filter((item) => item.note)
    .map((item) => `• ${item.label}: ${item.note}`)
    .join("\n")
);

const flagCount = computed(() => Object.values(flags.value).filter((f) => f.flagged).length);

const activeRejectionTemplates = computed(() =>
  store.rejectionTemplates.filter((template) => template.active !== false)
);

const selectedRejectionTemplate = computed(() =>
  store.rejectionTemplates.find((template) => template.code === rejectForm.value.rejectionCode)
);

const auditSections = computed(() => [
  {
    id: "businessProfile",
    title: "Business Profile",
    icon: "storefront",
    fields: [
      { key: "tradingName", field: "businessTradingName", label: "Trading Name", value: detail.value?.businessProfile?.tradingName },
      { key: "businessType", field: "businessType", label: "Business Type", value: detail.value?.businessProfile?.businessType },
      { key: "registrationNumber", field: "businessRegistrationNumber", label: "Registration Number", value: detail.value?.businessProfile?.registrationNumber },
      { key: "industry", label: "Industry", value: detail.value?.businessProfile?.industry },
      { key: "taxIdNumber", field: "businessTaxIdNumber", label: "Tax ID Number", value: detail.value?.businessProfile?.taxIdNumber },
      { key: "expectedIncome", field: "businessExpectedMonthlyIncome", label: "Expected Monthly Income", value: detail.value?.businessProfile?.expectedIncome },
      { key: "staffSize", label: "Staff Size", value: detail.value?.businessProfile?.staffSize },
      { key: "storefrontUrl", field: "businessStorefrontUrl", label: "Storefront URL", value: detail.value?.businessProfile?.storefrontUrl },
      { key: "description", field: "businessDescription", label: "Business Description", value: detail.value?.businessProfile?.description, full: true },
      { key: "cacDocumentUrl", label: "CAC Document", value: detail.value?.businessProfile?.cacDocumentUrl, isDoc: true, docTitle: "CAC Document", documentType: "CAC_DOCUMENT", verified: detail.value?.businessProfile?.cacDocumentVerified },
    ],
  },
  {
    id: "owner",
    title: "Owner Details",
    icon: "person",
    fields: [
      { key: "fullName", label: "Full Name", value: detail.value?.owner?.fullName },
      { key: "email", label: "Email Address", value: detail.value?.owner?.email },
      { key: "phoneNumber", label: "Phone Number", value: detail.value?.owner?.phoneNumber },
      { key: "dob", label: "Date of Birth", value: detail.value?.owner?.dob },
      { key: "nationality", label: "Nationality", value: detail.value?.owner?.nationality },
      { key: "idType", label: "ID Type", value: detail.value?.owner?.idType },
      { key: "idNumber", label: "ID Number", value: detail.value?.owner?.idNumber },
      { key: "address", label: "Address", value: detail.value?.owner?.address, full: true },
      { key: "idDocumentUrl", label: "ID Document", value: detail.value?.owner?.idDocumentUrl, isDoc: true, docTitle: "ID Document", documentType: "ID_DOCUMENT", verified: detail.value?.owner?.idDocumentVerified },
      { key: "proofOfAddressUrl", field: "proofOfAddress", label: "Proof of Address", value: detail.value?.owner?.proofOfAddressUrl, isDoc: true, docTitle: "Proof of Address", documentType: "PROOF_OF_ADDRESS", verified: detail.value?.owner?.proofOfAddressVerified },
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    icon: "contact_mail",
    fields: [
      { key: "country", field: "businessCountry", label: "Country", value: detail.value?.contact?.country },
      { key: "state", field: "businessState", label: "State", value: detail.value?.contact?.state },
      { key: "city", field: "businessCity", label: "City", value: detail.value?.contact?.city },
      { key: "primaryPhone", field: "businessPrimaryPhoneNumber", label: "Primary Phone", value: detail.value?.contact?.primaryPhone },
      { key: "secondaryPhone", field: "businessSecondaryPhoneNumber", label: "Secondary Phone", value: detail.value?.contact?.secondaryPhone },
      { key: "supportEmail", field: "businessSupportEmailAddress", label: "Support Email", value: detail.value?.contact?.supportEmail },
      { key: "generalEmail", field: "businessGeneralEmailAddress", label: "General Email", value: detail.value?.contact?.generalEmail },
      { key: "address", field: "businessAddress", label: "Business Address", value: detail.value?.contact?.address, full: true },
    ],
  },
  {
    id: "settlement",
    title: "Settlement Account",
    icon: "account_balance",
    fields: [
      { key: "bankName", label: "Bank Name", value: detail.value?.settlement?.bankName },
      { key: "accountName", label: "Account Name", value: detail.value?.settlement?.accountName },
      { key: "accountNumber", label: "Account Number", value: detail.value?.settlement?.accountNumber },
      { key: "bankCode", label: "Bank Code", value: detail.value?.settlement?.bankCode },
    ],
  },
]);

const statusConfig = {
  NOT_SUBMITTED: { label: "Not Submitted", class: "bg-slate-100 text-slate-600" },
  AWAITING_APPROVAL: { label: "Awaiting Approval", class: "bg-yellow-100 text-yellow-700" },
  UNDER_REVIEW: { label: "Under Review", class: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", class: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", class: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspended", class: "bg-orange-100 text-orange-700" },
};

const timelineEventColors = {
  SUBMIT: "bg-blue-400",
  START_REVIEW: "bg-yellow-400",
  APPROVE: "bg-green-500",
  REJECT: "bg-red-500",
  SUSPEND: "bg-orange-400",
  OVERRIDE_ENABLED: "bg-purple-500",
  OVERRIDE_DISABLED: "bg-slate-400",
  DOCUMENT_APPROVED: "bg-green-400",
  DOCUMENT_REJECTED: "bg-red-400",
};

function statusCfg(status) {
  return statusConfig[status] || statusConfig.NOT_SUBMITTED;
}

function timelineDotColor(event) {
  return timelineEventColors[event] || "bg-slate-300";
}

function timelineLabel(entry) {
  const who = entry.adminId ? `Admin ${entry.adminId}` : `Merchant`;
  if (entry.event === "SUBMIT") return `${who} submitted for review`;
  if (entry.event === "START_REVIEW") return `${who} moved status to UNDER_REVIEW`;
  if (entry.event === "APPROVE") return `${who} approved the merchant`;
  if (entry.event === "REJECT") return `${who} rejected the merchant`;
  if (entry.event === "SUSPEND") return `${who} suspended the merchant`;
  if (entry.event === "OVERRIDE_ENABLED") return `${who} granted live mode override`;
  if (entry.event === "OVERRIDE_DISABLED") return `${who} revoked live mode override`;
  if (entry.event === "DOCUMENT_APPROVED") return `${who} approved the ${entry.documentType || "document"}`;
  if (entry.event === "DOCUMENT_REJECTED") return `${who} rejected the ${entry.documentType || "document"}`;
  return `${who} moved status to ${entry.toStatus}`;
}

function getFlagKey(sectionId, fieldKey) {
  return `${sectionId}.${fieldKey}`;
}

function toggleFlag(section, field) {
  const fieldKey = getFlagKey(section.id, field.key);

  if (!flags.value[fieldKey]) {
    flags.value[fieldKey] = {
      flagged: true,
      field: field.field || field.key,
      label: field.label,
      note: "",
    };
  } else {
    flags.value[fieldKey] = { ...flags.value[fieldKey], flagged: !flags.value[fieldKey].flagged };
  }
}

function isFlagged(fieldKey) {
  return !!flags.value[fieldKey]?.flagged;
}

function viewDoc(url, title) {
  activeDoc.value = url;
  activeDocTitle.value = title;
  docZoom.value = 1;
  docRotation.value = 0;
}

function openRejectModal() {
  showRejectModal.value = true;
}

function formatExpiresAt(dtLocal) {
  if (!dtLocal) return null;
  return dtLocal.replace("T", " ") + ":00";
}

async function handleApprove() {
  actionLoading.value = true;
  try {
    await store.reviewCompliance(
      tenantId,
      {
        action: "APPROVE",
        reviewNote: "All submitted documents are valid.",
      },
      { silent: true }
    );
    toastStore.success(`Merchant ${detail.value?.businessName} has been successfully APPROVED.`, "");
    router.push({ name: "dashboard-compliance" });
  } catch (err) {
    logger.error("Failed to approve compliance", err);
  } finally {
    actionLoading.value = false;
  }
}

async function handleReject() {
  if (!fieldErrors.value.length) {
    toastStore.error("Flag at least one field before rejecting this merchant.", "");
    return;
  }

  const hasEmptyFieldNote = fieldErrors.value.some((item) => !item.note);
  if (hasEmptyFieldNote) {
    toastStore.error("Add a correction note for every flagged field.", "");
    return;
  }

  actionLoading.value = true;
  try {
    await store.reviewCompliance(
      tenantId,
      {
        action: "REJECT",
        rejectionCode: rejectForm.value.rejectionCode,
        globalNote: rejectForm.value.globalNote,
        fieldErrors: fieldErrors.value,
      },
      { silent: true }
    );
    toastStore.success(`Merchant ${detail.value?.businessName} has been REJECTED. Notification sent.`, "");
    router.push({ name: "dashboard-compliance" });
  } catch (err) {
    logger.error("Failed to reject compliance", err);
    actionLoading.value = false;
    showRejectModal.value = false;
  }
}

async function handleSuspend() {
  actionLoading.value = true;
  try {
    await store.reviewCompliance(
      tenantId,
      {
        action: "SUSPEND",
        reviewNote: "Suspended due to suspicious compliance activity.",
      },
      { silent: true }
    );
    toastStore.success(`Merchant ${detail.value?.businessName} has been SUSPENDED.`, "");
    router.push({ name: "dashboard-compliance" });
  } catch (err) {
    logger.error("Failed to suspend compliance", err);
  } finally {
    actionLoading.value = false;
  }
}

async function handleGrantOverride() {
  actionLoading.value = true;
  try {
    await store.grantOverride(tenantId, {
      reason: overrideForm.value.reason,
      expiresAt: formatExpiresAt(overrideForm.value.expiresAt),
    });
    toastStore.success("Live mode override granted.", "");
    showOverrideModal.value = false;
    overrideForm.value = { reason: "", expiresAt: "" };
    await store.fetchTenantDetail(tenantId);
  } catch (err) {
    logger.error("Failed to grant override", err);
  } finally {
    actionLoading.value = false;
  }
}

async function handleRevokeOverride() {
  actionLoading.value = true;
  try {
    await store.revokeOverride(tenantId);
    toastStore.success("Live mode override has been revoked.", "");
    await store.fetchTenantDetail(tenantId);
  } catch (err) {
    logger.error("Failed to revoke override", err);
  } finally {
    actionLoading.value = false;
  }
}

async function handleDocApprove(documentType) {
  docReviewLoading.value[documentType] = true;
  try {
    await store.reviewDocumentFile(tenantId, { documentType, action: "APPROVE" });
    showDocRejectInput.value[documentType] = false;
  } catch (err) {
    logger.error("Failed to approve document", err);
  } finally {
    docReviewLoading.value[documentType] = false;
  }
}

async function handleDocReject(documentType) {
  docReviewLoading.value[documentType] = true;
  try {
    await store.reviewDocumentFile(tenantId, {
      documentType,
      action: "REJECT",
      note: docRejectNote.value[documentType] || "",
    });
    showDocRejectInput.value[documentType] = false;
    docRejectNote.value[documentType] = "";
  } catch (err) {
    logger.error("Failed to reject document", err);
  } finally {
    docReviewLoading.value[documentType] = false;
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchTenantDetail(tenantId),
    store.fetchRejectionTemplates(),
  ]);

  if (store.detail?.currentStatus === "AWAITING_APPROVAL") {
    try {
      await store.reviewCompliance(
        tenantId,
        {
          action: "UNDER_REVIEW",
          reviewNote: "Review started by compliance team.",
        },
        { silent: true }
      );
      await store.fetchTenantDetail(tenantId);
    } catch (err) {
      logger.error("Failed to auto-trigger START_REVIEW", err);
    }
  }

  const cac = store.detail?.businessProfile?.cacDocumentUrl;
  if (cac) viewDoc(cac, "CAC Document");
});

watch(
  () => rejectForm.value.rejectionCode,
  (_code, oldCode) => {
    const previousTemplate = store.rejectionTemplates.find((template) => template.code === oldCode);
    const currentTemplate = selectedRejectionTemplate.value;

    if (!currentTemplate) return;

    if (!rejectForm.value.globalNote || rejectForm.value.globalNote === previousTemplate?.message) {
      rejectForm.value.globalNote = currentTemplate.message || "";
    }
  }
);
</script>

<template>
  <div>
  <!-- Loading skeleton -->
  <div v-if="store.detailLoading" class="flex items-center justify-center py-[6rem] text-[#616161]">
    <span class="animate-spin material-symbols-outlined mr-[1rem] text-[2.4rem] text-primary">progress_activity</span>
    Loading compliance details...
  </div>

  <div v-else-if="store.error && !detail" class="rounded-[8px] border border-red-200 bg-red-50 p-[2rem] text-red-700">
    {{ store.error }}
  </div>

  <div v-else class="flex flex-col text-[1.4rem] text-dashboard_text_color">

    <!-- ===== PAGE HEADER ===== -->
    <div class="mb-[1.6rem] rounded-[8px] bg-white p-[2rem] shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-[1.2rem]">
        <div class="flex items-center gap-[1.2rem]">
          <button
            class="flex items-center gap-[0.4rem] rounded-[6px] px-[1rem] py-[0.6rem] text-[1.3rem] font-[600] text-slate-600 transition-colors hover:bg-slate-100"
            @click="router.push({ name: 'dashboard-compliance' })"
          >
            <span class="material-symbols-outlined text-[1.8rem]">arrow_back</span>
            Queue
          </button>
          <div class="h-[2rem] w-[0.1rem] bg-slate-200"></div>
          <div>
            <h1 class="text-[2rem] font-[700] text-[#000]">{{ detail?.businessName || "Merchant Audit" }}</h1>
            <p class="text-[1.2rem] text-[#616161]">Tenant ID: {{ tenantId }}</p>
          </div>
        </div>
        <span
          :class="['inline-flex items-center rounded-full px-[1.2rem] py-[0.5rem] text-[1.3rem] font-[700]', statusCfg(detail?.currentStatus).class]"
        >
          {{ statusCfg(detail?.currentStatus).label }}
        </span>
      </div>

      <!-- Override warning banner -->
      <div
        v-if="detail?.isOverrideActive"
        class="mt-[1.4rem] flex items-center gap-[1rem] rounded-[8px] border border-purple-200 bg-purple-50 px-[1.4rem] py-[1rem]"
      >
        <span class="material-symbols-outlined text-purple-600">shield_with_heart</span>
        <p class="text-[1.3rem] font-[600] text-purple-800">
          Override Active: This merchant can operate in Live Mode regardless of compliance status.
          <span v-if="detail?.overrideReason" class="font-normal"> Reason: {{ detail.overrideReason }}</span>
        </p>
      </div>
    </div>

    <!-- ===== SPLIT VIEW ===== -->
    <div class="flex items-start gap-[2rem] pb-[10rem]">

      <!-- LEFT PANEL: Audit Form (60%) -->
      <div class="flex-[3] space-y-[1.6rem]">
        <div
          v-for="section in auditSections"
          :key="section.id"
          class="overflow-hidden rounded-[8px] bg-white shadow-sm"
        >
          <!-- Section header -->
          <div class="flex items-center gap-[1rem] border-b border-slate-100 bg-slate-50 px-[2rem] py-[1.4rem]">
            <span class="material-symbols-outlined text-primary">{{ section.icon }}</span>
            <h2 class="text-[1.6rem] font-[700] text-[#000]">{{ section.title }}</h2>
          </div>

          <!-- Fields grid -->
          <div class="grid grid-cols-2 gap-[1.2rem] p-[1.6rem]">
            <div
              v-for="field in section.fields"
              :key="field.key"
              :class="field.full ? 'col-span-2' : 'col-span-1'"
            >
              <div
                :class="[
                  'rounded-[8px] border p-[1.2rem] transition-colors',
                  isFlagged(getFlagKey(section.id, field.key)) ? 'border-red-300 bg-red-50' : 'border-slate-100',
                ]"
              >
                <div class="flex items-start justify-between gap-[0.8rem]">
                  <div class="min-w-0 flex-1">
                    <p class="mb-[0.4rem] text-[1.1rem] font-[600] uppercase tracking-wider text-[#616161]">
                      {{ field.label }}
                    </p>
                    <!-- Document link -->
                    <div v-if="field.isDoc">
                      <!-- Verification badge -->
                      <span
                        v-if="field.verified === true"
                        class="mb-[0.6rem] inline-flex items-center gap-[0.3rem] rounded-full bg-green-100 px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[600] text-green-700"
                      >
                        <span class="material-symbols-outlined text-[1.4rem]">verified</span> Verified
                      </span>
                      <span
                        v-else-if="field.verified === false"
                        class="mb-[0.6rem] inline-flex items-center gap-[0.3rem] rounded-full bg-red-100 px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[600] text-red-700"
                      >
                        <span class="material-symbols-outlined text-[1.4rem]">cancel</span> Rejected
                      </span>
                      <span
                        v-else
                        class="mb-[0.6rem] inline-flex items-center gap-[0.3rem] rounded-full bg-slate-100 px-[0.8rem] py-[0.2rem] text-[1.1rem] font-[600] text-slate-500"
                      >
                        <span class="material-symbols-outlined text-[1.4rem]">hourglass_empty</span> Pending
                      </span>

                      <!-- View link -->
                      <div class="mt-[0.4rem] mb-[0.8rem]">
                        <button
                          v-if="field.value"
                          class="flex items-center gap-[0.4rem] text-[1.3rem] font-[600] text-primary underline hover:no-underline"
                          @click="viewDoc(field.value, field.docTitle)"
                        >
                          <span class="material-symbols-outlined text-[1.6rem]">visibility</span>
                          View {{ field.docTitle }}
                        </button>
                        <span v-else class="italic text-[1.3rem] text-slate-400">Not uploaded</span>
                      </div>

                      <!-- Per-document actions -->
                      <div v-if="field.value && field.documentType" class="flex items-center gap-[0.6rem]">
                        <button
                          :disabled="docReviewLoading[field.documentType]"
                          class="flex items-center gap-[0.3rem] rounded-[6px] border border-green-400 px-[0.8rem] py-[0.4rem] text-[1.2rem] font-[600] text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="handleDocApprove(field.documentType)"
                        >
                          <span v-if="docReviewLoading[field.documentType]" class="animate-spin material-symbols-outlined text-[1.4rem]">progress_activity</span>
                          <span v-else class="material-symbols-outlined text-[1.4rem]">check_circle</span>
                          Approve
                        </button>
                        <button
                          :disabled="docReviewLoading[field.documentType]"
                          class="flex items-center gap-[0.3rem] rounded-[6px] border border-red-400 px-[0.8rem] py-[0.4rem] text-[1.2rem] font-[600] text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="showDocRejectInput[field.documentType] = !showDocRejectInput[field.documentType]"
                        >
                          <span class="material-symbols-outlined text-[1.4rem]">cancel</span>
                          Reject
                        </button>
                      </div>

                      <!-- Reject note input -->
                      <div v-if="field.documentType && showDocRejectInput[field.documentType]" class="mt-[0.8rem] flex gap-[0.6rem]">
                        <input
                          v-model="docRejectNote[field.documentType]"
                          placeholder="Optional rejection note..."
                          class="flex-1 rounded-[6px] border border-red-200 bg-white px-[1rem] py-[0.6rem] text-[1.3rem] focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                        <button
                          :disabled="docReviewLoading[field.documentType]"
                          class="flex-shrink-0 rounded-[6px] bg-red-600 px-[1rem] py-[0.6rem] text-[1.2rem] font-[700] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          @click="handleDocReject(field.documentType)"
                        >
                          <span v-if="docReviewLoading[field.documentType]" class="animate-spin material-symbols-outlined text-[1.4rem]">progress_activity</span>
                          <span v-else>Confirm</span>
                        </button>
                      </div>
                    </div>
                    <!-- Regular value -->
                    <p v-else class="break-words text-[1.4rem] font-[500] text-[#000]">
                      {{ field.value || "—" }}
                    </p>
                  </div>
                  <button
                    :title="isFlagged(getFlagKey(section.id, field.key)) ? 'Remove flag' : 'Flag this field'"
                    :class="[
                      'flex-shrink-0 rounded-[6px] p-[0.4rem] transition-colors',
                      isFlagged(getFlagKey(section.id, field.key))
                        ? 'bg-red-100 text-red-500 hover:bg-red-200'
                        : 'text-slate-200 hover:bg-slate-100 hover:text-slate-500',
                    ]"
                    @click="toggleFlag(section, field)"
                  >
                    <span class="material-symbols-outlined text-[1.8rem]">flag</span>
                  </button>
                </div>
                <!-- Correction note input -->
                <div v-if="isFlagged(getFlagKey(section.id, field.key))" class="mt-[1rem]">
                  <input
                    v-model="flags[getFlagKey(section.id, field.key)].note"
                    placeholder="Add correction note..."
                    class="w-full rounded-[6px] border border-red-200 bg-white px-[1rem] py-[0.7rem] text-[1.3rem] focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Evidence Vault (40%) -->
      <div class="flex-[2] self-start sticky top-[2rem] space-y-[1.6rem]">

        <!-- Override Status Card -->
        <div v-if="detail?.isOverrideActive" class="rounded-[10px] border border-purple-200 bg-purple-50 p-[1.6rem]">
          <div class="flex items-start justify-between gap-[1rem]">
            <div class="flex items-center gap-[0.8rem]">
              <span class="material-symbols-outlined text-purple-600">shield_with_heart</span>
              <p class="text-[1.4rem] font-[700] text-purple-800">Override Active</p>
            </div>
            <button
              :disabled="actionLoading"
              class="flex-shrink-0 rounded-[6px] border border-red-300 px-[1.2rem] py-[0.6rem] text-[1.2rem] font-[600] text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleRevokeOverride"
            >
              Disable Override
            </button>
          </div>
          <p class="mt-[1rem] text-[1.3rem] text-purple-700">
            <span class="font-[600]">Merchant is in Live Mode.</span>
          </p>
          <p v-if="detail?.overrideReason" class="mt-[0.4rem] text-[1.3rem] text-purple-700">
            <span class="font-[600]">Reason:</span> {{ detail.overrideReason }}
          </p>
        </div>

        <div v-else class="rounded-[10px] border border-slate-200 bg-slate-50 p-[1.6rem]">
          <div class="flex items-center justify-between gap-[1rem]">
            <div class="flex items-center gap-[0.8rem] text-slate-500">
              <span class="material-symbols-outlined">shield</span>
              <p class="text-[1.4rem] font-[600]">No Active Override</p>
            </div>
            <button
              class="flex-shrink-0 rounded-[6px] border border-purple-400 px-[1.2rem] py-[0.6rem] text-[1.2rem] font-[600] text-purple-700 transition-colors hover:bg-purple-50"
              @click="showOverrideModal = true"
            >
              Grant Override
            </button>
          </div>
        </div>

        <!-- Document Viewer -->
        <div class="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
          <div class="flex items-center justify-between border-b border-slate-100 px-[1.6rem] py-[1rem]">
            <p class="text-[1.4rem] font-[700] text-[#000]">
              {{ activeDocTitle || "Document Viewer" }}
            </p>
            <div class="flex items-center gap-[0.4rem]">
              <button
                title="Zoom in"
                class="rounded p-[0.4rem] text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                @click="docZoom = Math.min(docZoom + 0.25, 3)"
              >
                <span class="material-symbols-outlined text-[2rem]">zoom_in</span>
              </button>
              <button
                title="Zoom out"
                class="rounded p-[0.4rem] text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                @click="docZoom = Math.max(docZoom - 0.25, 0.5)"
              >
                <span class="material-symbols-outlined text-[2rem]">zoom_out</span>
              </button>
              <button
                title="Rotate"
                class="rounded p-[0.4rem] text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                @click="docRotation = (docRotation + 90) % 360"
              >
                <span class="material-symbols-outlined text-[2rem]">rotate_right</span>
              </button>
            </div>
          </div>
          <div class="flex h-[40rem] items-center justify-center overflow-auto bg-slate-100">
            <div
              v-if="activeDoc"
              :style="{ transform: `scale(${docZoom}) rotate(${docRotation}deg)`, transformOrigin: 'center', transition: 'transform 0.2s ease' }"
            >
              <iframe
                :src="activeDoc"
                class="h-[38rem] w-[28rem] border-0 bg-white"
                title="Document preview"
              />
            </div>
            <div v-else class="flex flex-col items-center gap-[0.8rem] text-slate-400">
              <span class="material-symbols-outlined text-[4rem]">article</span>
              <p class="text-[1.3rem]">Select a document to preview</p>
            </div>
          </div>
        </div>

        <!-- Audit Timeline -->
        <div class="rounded-[10px] border border-slate-200 bg-white p-[1.6rem]">
          <h3 class="mb-[1.6rem] text-[1.6rem] font-[700] text-[#000]">Audit Timeline</h3>
          <div v-if="!detail?.history?.length" class="py-[2rem] text-center text-[1.3rem] text-slate-400">
            No activity recorded yet.
          </div>
          <div v-else class="space-y-0">
            <div
              v-for="(entry, index) in [...(detail?.history || [])].reverse()"
              :key="entry.id || index"
              class="flex gap-[1.2rem]"
            >
              <div class="flex flex-col items-center">
                <div :class="['mt-[0.5rem] h-[0.9rem] w-[0.9rem] flex-shrink-0 rounded-full', timelineDotColor(entry.event)]"></div>
                <div v-if="index < detail.history.length - 1" class="mt-[0.4rem] w-[0.2rem] flex-1 bg-slate-200"></div>
              </div>
              <div class="pb-[1.4rem] flex-1 min-w-0">
                <p class="text-[1.3rem] font-[600] text-[#000]">{{ timelineLabel(entry) }}</p>
                <p v-if="entry.reason" class="mt-[0.2rem] text-[1.2rem] text-slate-500">{{ entry.reason }}</p>
                <p class="mt-[0.2rem] text-[1.1rem] text-slate-400">{{ formatDate(entry.timestamp) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== STICKY ACTION FOOTER ===== -->
    <div class="sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-200 bg-white px-[2rem] py-[1.4rem] shadow-lg">
      <p class="text-[1.3rem] text-[#616161]">
        <span v-if="flagCount > 0" class="font-[600] text-red-600">
          <span class="material-symbols-outlined align-middle text-[1.6rem]">flag</span>
          {{ flagCount }} field{{ flagCount === 1 ? "" : "s" }} flagged
        </span>
        <span v-else class="text-slate-400">No fields flagged</span>
      </p>
      <div class="flex items-center gap-[1.2rem]">
        <button
          class="flex items-center gap-[0.6rem] rounded-[8px] border border-red-400 px-[2rem] py-[1rem] text-[1.4rem] font-[700] text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionLoading"
          @click="openRejectModal"
        >
          <span class="material-symbols-outlined text-[1.8rem]">cancel</span>
          Reject
        </button>
        <button
          class="flex items-center gap-[0.6rem] rounded-[8px] border border-orange-400 px-[2rem] py-[1rem] text-[1.4rem] font-[700] text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionLoading"
          @click="handleSuspend"
        >
          <span class="material-symbols-outlined text-[1.8rem]">block</span>
          Suspend
        </button>
        <button
          :disabled="hasFlaggedFields || actionLoading"
          class="flex items-center gap-[0.6rem] rounded-[8px] bg-green-600 px-[2.4rem] py-[1rem] text-[1.4rem] font-[700] text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          @click="handleApprove"
        >
          <span v-if="actionLoading" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
          <span v-else class="material-symbols-outlined text-[1.8rem]">check_circle</span>
          Approve
        </button>
      </div>
    </div>
  </div>

  <!-- ===== REJECT MODAL ===== -->
  <Teleport to="body">
    <div
      v-if="showRejectModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[1.6rem]"
      @click.self="showRejectModal = false"
    >
      <div class="w-full max-w-[56rem] rounded-[12px] bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.6rem]">
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Reject Merchant</h2>
          <button class="text-slate-400 hover:text-slate-600" @click="showRejectModal = false">
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <div class="px-[2.4rem] py-[2rem] space-y-[1.6rem]">
          <!-- Aggregated flag notes -->
          <div v-if="flaggedNotes" class="rounded-[8px] border border-red-200 bg-red-50 p-[1.2rem]">
            <p class="mb-[0.6rem] text-[1.2rem] font-[700] text-red-700">Flagged Issues:</p>
            <pre class="whitespace-pre-wrap text-[1.2rem] text-red-600">{{ flaggedNotes }}</pre>
          </div>

          <!-- Rejection code -->
          <div>
            <label class="mb-[0.6rem] block text-[1.3rem] font-[500] text-[#000]">Rejection Code</label>
            <select
              v-model="rejectForm.rejectionCode"
              class="h-14 w-full rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 text-[1.4rem] outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="">
                {{ store.rejectionTemplatesLoading ? "Loading templates..." : "Select a code..." }}
              </option>
              <option
                v-for="template in activeRejectionTemplates"
                :key="template.id || template.code"
                :value="template.code"
              >
                {{ template.label || template.code }}
              </option>
            </select>
            <p v-if="selectedRejectionTemplate?.nextSteps" class="mt-[0.6rem] text-[1.2rem] text-slate-500">
              {{ selectedRejectionTemplate.nextSteps }}
            </p>
          </div>

          <!-- Rejection message -->
          <div>
            <label class="mb-[0.6rem] block text-[1.3rem] font-[500] text-[#000]">Global Note to Merchant <span class="text-red-500">*</span></label>
            <textarea
              v-model="rejectForm.globalNote"
              rows="3"
              placeholder="Merchant-facing summary. Overrides the template message when provided."
              class="w-full resize-none rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3 text-[1.4rem] outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Field errors -->
          <div class="rounded-[8px] border border-slate-200 bg-slate-50 p-[1.2rem]">
            <p class="mb-[0.6rem] text-[1.2rem] font-[700] text-slate-700">Field-Level Corrections</p>
            <div v-if="fieldErrors.length" class="space-y-[0.8rem]">
              <div
                v-for="item in fieldErrors"
                :key="item.field"
                class="rounded-[6px] bg-white p-[1rem] text-[1.2rem] text-slate-600"
              >
                <p class="font-[700] text-[#000]">{{ item.label }}</p>
                <p>{{ item.note || "Add a correction note on the flagged field." }}</p>
              </div>
            </div>
            <p v-else class="text-[1.2rem] text-slate-500">Flag at least one field to reject this merchant.</p>
          </div>
        </div>

        <div class="flex justify-end gap-[1.2rem] border-t border-slate-100 px-[2.4rem] py-[1.6rem]">
          <button
            class="rounded-[8px] border border-slate-200 px-[2rem] py-[1rem] text-[1.4rem] font-[600] text-slate-700 hover:bg-slate-50"
            @click="showRejectModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="!rejectForm.globalNote || !fieldErrors.length || actionLoading"
            class="flex items-center gap-[0.8rem] rounded-[8px] bg-red-600 px-[2rem] py-[1rem] text-[1.4rem] font-[700] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            @click="handleReject"
          >
            <span v-if="actionLoading" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ===== GRANT OVERRIDE MODAL ===== -->
  <Teleport to="body">
    <div
      v-if="showOverrideModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[1.6rem]"
      @click.self="showOverrideModal = false"
    >
      <div class="w-full max-w-[50rem] rounded-[12px] bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-[2.4rem] py-[1.6rem]">
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Grant Temporary Override</h2>
          <button class="text-slate-400 hover:text-slate-600" @click="showOverrideModal = false">
            <span class="material-symbols-outlined text-[2.4rem]">close</span>
          </button>
        </div>

        <div class="px-[2.4rem] py-[2rem] space-y-[1.6rem]">
          <div>
            <label class="mb-[0.6rem] block text-[1.3rem] font-[500] text-[#000]">Reason <span class="text-red-500">*</span></label>
            <textarea
              v-model="overrideForm.reason"
              rows="3"
              placeholder="Why is this merchant being bypassed? e.g. Migrated merchant — compliance verified offline"
              class="w-full resize-none rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3 text-[1.4rem] outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label class="mb-[0.6rem] block text-[1.3rem] font-[500] text-[#000]">
              Expiry Date
              <span class="ml-[0.4rem] text-[1.2rem] font-normal text-slate-400">(optional — leave blank for permanent override)</span>
            </label>
            <input
              v-model="overrideForm.expiresAt"
              type="datetime-local"
              class="h-14 w-full rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 text-[1.4rem] outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div class="flex justify-end gap-[1.2rem] border-t border-slate-100 px-[2.4rem] py-[1.6rem]">
          <button
            class="rounded-[8px] border border-slate-200 px-[2rem] py-[1rem] text-[1.4rem] font-[600] text-slate-700 hover:bg-slate-50"
            @click="showOverrideModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="!overrideForm.reason || actionLoading"
            class="flex items-center gap-[0.8rem] rounded-[8px] bg-purple-700 px-[2rem] py-[1rem] text-[1.4rem] font-[700] text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
            @click="handleGrantOverride"
          >
            <span v-if="actionLoading" class="animate-spin material-symbols-outlined text-[1.8rem]">progress_activity</span>
            Grant Override
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ===== ACTION LOADING OVERLAY ===== -->
  <Teleport to="body">
    <div
      v-if="actionLoading && !showRejectModal && !showOverrideModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    >
      <div class="flex items-center gap-[1.6rem] rounded-[12px] bg-white p-[2.4rem] shadow-2xl">
        <span class="animate-spin material-symbols-outlined text-[3.2rem] text-primary">progress_activity</span>
        <p class="text-[1.6rem] font-[600] text-[#000]">Processing...</p>
      </div>
    </div>
  </Teleport>
  </div>
</template>
