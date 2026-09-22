<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import * as XLSX from "xlsx";
import { useAdminProductImportStore } from "~/stores/adminProductImport.store.js";
import { useAdminMerchantsStore } from "~/stores/adminMerchants.store.js";
import { useToastStore } from "~/stores/toast.store.js";
import SearchableSelectInput from "~/components/SearchableSelectInput.vue";
import DataTable from "~/components/table/DataTable.vue";
import { logger } from "~/utils/helpers.js";

definePageMeta({
  layout: "dashboard",
  middleware: "auth-middleware",
  name: "dashboard-product-import",
});

useHead({
  title: "Product Import - ShopSynch Admin",
});

const route = useRoute();
const importStore = useAdminProductImportStore();
const merchantsStore = useAdminMerchantsStore();
const toastStore = useToastStore();

const isDragging = ref(false);
const fileError = ref("");
const fileInputRef = ref(null);

// Merchant selection
const selectedTenantId = ref(route.query.tenantId || importStore.selectedTenantId || "");
const selectedMerchant = ref(null);
const merchantOptions = computed(() => {
  return merchantsStore.merchants.map((m) => ({
    label: `${m.businessTradingName || "Untitled"} (${m.code || m.id})`,
    value: m.id,
  }));
});

// Target fields for Simple V2 products
const targetFields = [
  { key: "name", label: "Product Name", required: true, description: "Display name of the product" },
  { key: "description", label: "Description", required: true, description: "Detailed description (min 5 chars)" },
  { key: "price", label: "Price", required: true, description: "Selling price in store currency (min 1)" },
  { key: "costPrice", label: "Cost Price", required: false, description: "Cost or purchase price per unit (optional)" },
  { key: "category", label: "Category", required: true, description: "Existing category name or ID" },
  { key: "sku", label: "SKU", required: false, description: "Stock keeping unit code" },
  { key: "quantity", label: "Stock Quantity", required: false, description: "Initial on-hand inventory" },
  { key: "image", label: "Image URL", required: false, description: "Public image link (e.g. https://...)" },
  { key: "tags", label: "Tags", required: false, description: "Comma-separated keywords or labels (e.g. tag1, tag2)" },
];

const headerOptions = computed(() => {
  const options = [{ label: "-- Select column --", value: "" }];
  importStore.fileHeaders.forEach((h) => {
    options.push({ label: h, value: h });
  });
  return options;
});

const canProceedToPreview = computed(() => {
  return (
    Boolean(importStore.columnMapping.name) &&
    Boolean(importStore.columnMapping.description) &&
    Boolean(importStore.columnMapping.price) &&
    Boolean(importStore.columnMapping.category) &&
    importStore.rawRows.length > 0 &&
    importStore.rawRows.length <= 100
  );
});

// Sample preview rows
const sampledPreviewRows = computed(() => {
  const rows = importStore.previewJob?.rows || [];
  const validRows = rows.filter((r) => r.valid);
  if (validRows.length <= 10) return validRows;

  const top = validRows.slice(0, 4);
  const midIndex = Math.floor(validRows.length / 2);
  const mid = validRows.slice(Math.max(4, midIndex - 1), midIndex + 2);
  const last = validRows.slice(-3);

  const seen = new Set();
  const sample = [];
  [...top, ...mid, ...last].forEach((r) => {
    if (!seen.has(r.rowNumber)) {
      seen.add(r.rowNumber);
      sample.push(r);
    }
  });
  return sample;
});

// Preview DataTable headers
const previewTableHeaders = [
  { title: "Row #", accessor: "rowNumber" },
  { title: "Product Name", accessor: "name" },
  { title: "SKU", accessor: "sku" },
  { title: "Category", accessor: "category" },
  { title: "Price", accessor: "price" },
  { title: "Cost", accessor: "costPrice" },
  { title: "Tags", accessor: "tags" },
  { title: "Status", accessor: "status" },
  { title: "Image", accessor: "imageCheckStatus" },
  { title: "Validation Details", accessor: "errors" },
];

// Commit DataTable headers
const commitTableHeaders = [
  { title: "Row #", accessor: "rowNumber" },
  { title: "Product Name", accessor: "name" },
  { title: "Status", accessor: "status" },
  { title: "Product ID", accessor: "productId" },
  { title: "Result / Reason", accessor: "errors" },
];

// Full Row Validation Table filters
const previewFilters = ref({ search: "", category: "", status: "" });

const previewCategories = computed(() => {
  const rows = importStore.previewJob?.rows || [];
  return [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
});

const blockedCollisionRows = computed(() => {
  const rows = importStore.previewJob?.rows || [];
  return rows.filter((r) => !r.valid && r.duplicateGroupCode && r.suggestedSku);
});

const totalCollisionRows = computed(() => {
  const rows = importStore.previewJob?.rows || [];
  return rows.filter((r) => r.duplicateGroupCode);
});

const editingSkuRowNumber = ref(null);
const editingSkuValue = ref("");

function startEditingSku(rowNumber, currentSku) {
  editingSkuRowNumber.value = rowNumber;
  editingSkuValue.value = currentSku || "";
}

function cancelEditingSku() {
  editingSkuRowNumber.value = null;
  editingSkuValue.value = "";
}

function saveEditingSku(rowNumber) {
  const trimmed = editingSkuValue.value.trim();
  if (!trimmed) return;
  importStore.updateRowSku(rowNumber, trimmed);
  cancelEditingSku();
  toastStore.info(`Row #${rowNumber} SKU updated to "${trimmed}". Re-validate to check.`);
}

function handleAcceptSuffix(rowNumber, suggestedSku) {
  importStore.acceptSuggestedSuffix(rowNumber, suggestedSku);
  toastStore.success(`Row #${rowNumber} accepted suggested suffix: ${suggestedSku}`);
}

const hasActivePreviewFilters = computed(() =>
  Boolean(previewFilters.value.search || previewFilters.value.category || previewFilters.value.status)
);

const filteredPreviewRows = computed(() => {
  const rows = importStore.previewJob?.rows || [];
  const search = previewFilters.value.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (
      search &&
      !row.name?.toLowerCase().includes(search) &&
      !row.tags?.some((t) => t.toLowerCase().includes(search))
    )
      return false;
    if (previewFilters.value.category && row.category !== previewFilters.value.category) return false;
    if (previewFilters.value.status === "valid" && !row.valid) return false;
    if (previewFilters.value.status === "invalid" && row.valid) return false;
    if (previewFilters.value.status === "collision" && !row.duplicateGroupCode) return false;
    return true;
  });
});

function resetPreviewFilters() {
  previewFilters.value = { search: "", category: "", status: "" };
}

watch(() => importStore.previewJob, resetPreviewFilters);

// Elapsed time simulation stages
const waitElapsedSeconds = ref(0);
let waitTimer = null;

const previewStages = [
  { label: "Reading your file", atSecond: 0 },
  { label: "Checking required fields", atSecond: 3 },
  { label: "Validating prices and categories", atSecond: 8 },
  { label: "Finalizing results", atSecond: 15 },
];

const commitStages = [
  { label: "Reserving SKUs", atSecond: 0 },
  { label: "Creating products", atSecond: 3 },
  { label: "Setting up inventory", atSecond: 8 },
  { label: "Wrapping up", atSecond: 15 },
];

const activeWaitStages = computed(() => (importStore.currentStep === 4 ? commitStages : previewStages));

const activeStageIndex = computed(() => {
  const stages = activeWaitStages.value;
  let index = 0;
  stages.forEach((stage, i) => {
    if (waitElapsedSeconds.value >= stage.atSecond) index = i;
  });
  return Math.min(index, stages.length - 2);
});

const isTakingLonger = computed(() => waitElapsedSeconds.value >= 20);

watch(
  () => importStore.isPolling,
  (isPolling) => {
    clearInterval(waitTimer);
    waitTimer = null;
    if (isPolling) {
      waitElapsedSeconds.value = 0;
      waitTimer = setInterval(() => {
        waitElapsedSeconds.value += 1;
      }, 1000);
    }
  }
);

async function loadMerchants() {
  try {
    await merchantsStore.fetchMerchants({ limit: 100 });
  } catch (err) {
    logger.error("Failed to load merchants list", err);
  }
}

async function updateSelectedMerchant(tenantId) {
  if (!tenantId) {
    selectedMerchant.value = null;
    return;
  }
  selectedTenantId.value = tenantId;
  importStore.selectedTenantId = tenantId;

  // Find in merchants list or fetch
  const found = merchantsStore.merchants.find((m) => m.id === tenantId);
  if (found) {
    selectedMerchant.value = found;
  } else {
    try {
      await merchantsStore.fetchMerchantDetail(tenantId);
      selectedMerchant.value = merchantsStore.merchant;
    } catch {
      selectedMerchant.value = null;
    }
  }

  // Restore draft if any
  if (!importStore.restoreDraft(tenantId)) {
    // Only reset if step > 1 and tenant changed
    if (importStore.currentStep > 1) {
      importStore.reset(tenantId);
    }
  }
}

watch(selectedTenantId, (tid) => {
  updateSelectedMerchant(tid);
});

onMounted(async () => {
  await loadMerchants();
  if (selectedTenantId.value) {
    await updateSelectedMerchant(selectedTenantId.value);
  }
});

onUnmounted(() => {
  importStore.stopPolling();
  clearInterval(waitTimer);
});

watch(
  () => importStore.columnMapping,
  () => {
    if (importStore.currentStep === 2 && selectedTenantId.value) {
      importStore.saveDraft(selectedTenantId.value);
    }
  },
  { deep: true }
);

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) processFile(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (!selectedTenantId.value) {
    fileError.value = "Please select a target merchant before uploading a file.";
    toastStore.error("Please select a target merchant before uploading a file.", "");
    return;
  }

  fileError.value = "";
  const validExtensions = [".csv", ".xlsx", ".xls"];
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  if (!validExtensions.includes(extension)) {
    fileError.value = "Unsupported file type. Please upload a .csv, .xlsx, or .xls file.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    fileError.value = "File size exceeds 5MB limit. Please upload a smaller file.";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!json || json.length === 0) {
        fileError.value = "The uploaded file is empty or could not be read.";
        return;
      }

      if (json.length > 100) {
        fileError.value = `File contains ${json.length} rows. Maximum allowed is 100 rows per import. Please split your file into smaller batches.`;
        return;
      }

      importStore.fileName = file.name;
      importStore.rawRows = json;
      importStore.fileHeaders = Object.keys(json[0] || {});

      autoMatchHeaders();

      importStore.currentStep = 2;
      importStore.saveDraft(selectedTenantId.value);
      toastStore.success(`Uploaded ${json.length} rows successfully.`);
    } catch (err) {
      logger.error("Failed to parse file", err);
      fileError.value = "Failed to parse file. Please verify the spreadsheet format and try again.";
    }
  };
  reader.readAsArrayBuffer(file);
}

function autoMatchHeaders() {
  const headers = importStore.fileHeaders;
  const mapping = { ...importStore.columnMapping };

  headers.forEach((h) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!mapping.name && (clean.includes("name") || clean.includes("title") || clean.includes("product"))) {
      mapping.name = h;
    } else if (!mapping.description && (clean.includes("desc") || clean.includes("detail") || clean.includes("body"))) {
      mapping.description = h;
    } else if (
      !mapping.costPrice &&
      (clean.includes("costprice") || clean.includes("unitcost") || clean === "cost" || clean.startsWith("cost"))
    ) {
      mapping.costPrice = h;
    } else if (
      !mapping.price &&
      (clean.includes("price") || clean.includes("amount") || clean.includes("rate") || clean.includes("sellingprice"))
    ) {
      mapping.price = h;
    } else if (!mapping.category && (clean.includes("cat") || clean.includes("collection") || clean.includes("group") || clean.includes("type"))) {
      mapping.category = h;
    } else if (!mapping.sku && (clean.includes("sku") || clean.includes("barcode") || clean.includes("code"))) {
      mapping.sku = h;
    } else if (!mapping.quantity && (clean.includes("qty") || clean.includes("quantity") || clean.includes("stock") || clean.includes("count"))) {
      mapping.quantity = h;
    } else if (!mapping.image && (clean.includes("image") || clean.includes("img") || clean.includes("photo") || clean.includes("pic") || clean.includes("url"))) {
      mapping.image = h;
    } else if (!mapping.tags && (clean.includes("tag") || clean.includes("label") || clean.includes("keyword"))) {
      mapping.tags = h;
    }
  });

  importStore.columnMapping = mapping;
}

function discardDraft() {
  importStore.reset(selectedTenantId.value);
  if (fileInputRef.value) fileInputRef.value.value = "";
  toastStore.info("Draft discarded. Starting fresh.");
}

async function handleProceedToPreview() {
  if (!canProceedToPreview.value) {
    toastStore.error("Please map all required fields before proceeding.");
    return;
  }
  await importStore.initiatePreview(selectedTenantId.value);
}

async function handleCommitImport() {
  await importStore.initiateCommit(selectedTenantId.value);
}

function formatMoney(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
}
</script>

<template>
  <div class="text-[#121212] text-[1.4rem] leading-[1.5] space-y-[2.4rem] pb-[4rem]">
    <!-- Header -->
    <div class="flex flex-col gap-[0.4rem] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-[2.2rem] font-[700] text-[#000]">Staff Product Bulk Import</h1>
        <p class="text-[1.4rem] text-slate-500">
          Upload and bulk-create Simple products on behalf of any merchant (up to 100 rows per batch).
        </p>
      </div>

      <div v-if="importStore.hasRestoredDraft" class="flex items-center gap-[1.2rem]">
        <span class="rounded-full bg-amber-50 px-[1.2rem] py-[0.4rem] text-[1.2rem] font-semibold text-amber-700 border border-amber-200">
          Draft Restored
        </span>
        <button
          type="button"
          class="text-[1.2rem] font-medium text-slate-600 hover:text-red-600 underline cursor-pointer"
          @click="discardDraft"
        >
          Discard Draft
        </button>
      </div>
    </div>

    <!-- Wizard Stepper -->
    <nav aria-label="Progress" class="rounded-[10px] border border-slate-200 bg-white p-[1.6rem] shadow-sm">
      <ol class="grid grid-cols-2 gap-[1.6rem] md:grid-cols-4">
        <li
          v-for="(stepName, index) in ['1. Merchant & File', '2. Map Columns', '3. Preview & Validate', '4. Import Products']"
          :key="stepName"
          class="flex items-center gap-[1.2rem]"
        >
          <div
            class="flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-full text-[1.3rem] font-bold transition-colors"
            :class="[
              importStore.currentStep > index + 1
                ? 'bg-emerald-600 text-white'
                : importStore.currentStep === index + 1
                ? 'bg-primary text-white ring-4 ring-blue-50'
                : 'bg-slate-100 text-slate-500'
            ]"
          >
            <span v-if="importStore.currentStep > index + 1" class="material-symbols-outlined text-[1.4rem] font-bold">check</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span
            class="text-[1.3rem] font-semibold sm:text-[1.4rem]"
            :class="importStore.currentStep === index + 1 ? 'text-primary' : 'text-slate-600'"
          >
            {{ stepName }}
          </span>
        </li>
      </ol>
    </nav>

    <!-- STEP 1: MERCHANT & FILE UPLOAD -->
    <div v-if="importStore.currentStep === 1" class="space-y-[2rem]">
      <!-- Target Merchant Card -->
      <div class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem] shadow-sm">
        <div class="border-b border-slate-100 pb-[1.4rem]">
          <h2 class="text-[1.8rem] font-bold text-slate-900">1. Select Target Merchant</h2>
          <p class="mt-[0.2rem] text-[1.3rem] text-slate-500">
            Choose the merchant store to which these products will be imported.
          </p>
        </div>

        <div class="mt-[1.6rem] max-w-xl">
          <label class="font-[600] text-[1.4rem] text-[#0F172A] mb-2 block">
            Target Merchant <span class="text-red-500">*</span>
          </label>
          <SearchableSelectInput
            v-model="selectedTenantId"
            :options="merchantOptions"
            placeholder="Search and select a merchant..."
            search-placeholder="Search by merchant name or code..."
          />
        </div>

        <!-- Selected Merchant Details Preview -->
        <div v-if="selectedMerchant" class="mt-[1.6rem] rounded-[8px] border border-blue-100 bg-blue-50/50 p-[1.4rem] flex flex-wrap items-center justify-between gap-[1rem]">
          <div class="flex items-center gap-[1.2rem]">
            <span class="material-symbols-outlined text-[2.4rem] text-primary">storefront</span>
            <div>
              <p class="font-[700] text-[1.4rem] text-slate-900">{{ selectedMerchant.businessTradingName || selectedMerchant.name }}</p>
              <p class="text-[1.2rem] text-slate-500">Code: {{ selectedMerchant.code }} · Mode: {{ selectedMerchant.currentMode }}</p>
            </div>
          </div>
          <NuxtLink
            :to="`/dashboard/merchants/${selectedMerchant.id}`"
            target="_blank"
            class="text-[1.2rem] font-[600] text-primary underline hover:no-underline"
          >
            View Merchant Details
          </NuxtLink>
        </div>
      </div>

      <!-- File Upload Card -->
      <div class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem] shadow-sm">
        <!-- Card header: title + sample templates -->
        <div class="flex flex-col gap-[1.2rem] border-b border-slate-100 pb-[1.6rem] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-[1.8rem] font-bold text-slate-900">2. Upload Spreadsheet</h2>
            <p class="mt-[0.2rem] text-[1.3rem] text-slate-500">
              Upload a CSV, XLSX, or XLS file (up to 100 rows, max 5MB).
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-[1.6rem]">
            <span class="text-[1.3rem] text-slate-500">Sample templates:</span>
            <a
              href="/samples/sample_products_valid.csv"
              download="sample_products_valid.csv"
              class="inline-flex items-center gap-[0.4rem] text-[1.3rem] font-semibold text-primary hover:underline"
            >
              <span class="material-symbols-outlined text-[1.6rem]">description</span>
              CSV
            </a>
            <a
              href="/samples/sample_products_valid.xlsx"
              download="sample_products_valid.xlsx"
              class="inline-flex items-center gap-[0.4rem] text-[1.3rem] font-semibold text-primary hover:underline"
            >
              <span class="material-symbols-outlined text-[1.6rem]">table_view</span>
              Excel
            </a>
          </div>
        </div>

        <!-- Dropzone -->
        <div
          class="mt-[2.4rem] flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed p-[4rem] transition-colors"
          :class="[
            !selectedTenantId
              ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-200'
              : isDragging
              ? 'border-primary bg-blue-50'
              : 'border-slate-300 bg-[#F8FAFC] hover:border-slate-400 hover:bg-slate-100'
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div class="flex h-[5.6rem] w-[5.6rem] items-center justify-center rounded-full bg-blue-100 text-primary">
            <span class="material-symbols-outlined text-[3rem]">cloud_upload</span>
          </div>
          <p class="mt-[1.6rem] text-[1.6rem] font-semibold text-slate-900">
            {{ selectedTenantId ? "Drag and drop your file here" : "Please select a target merchant first" }}
          </p>
          <p class="mt-[0.4rem] text-[1.3rem] text-slate-500">or</p>
          <label
            for="file-upload"
            :class="[
              'mt-[1.2rem] inline-flex items-center gap-[0.8rem] rounded-[10px] bg-primary px-[2rem] py-[1rem] text-[1.4rem] font-semibold text-white shadow-sm hover:bg-blue-700',
              !selectedTenantId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            ]"
          >
            <span class="material-symbols-outlined text-[1.8rem]">upload_file</span>
            Browse Files
            <input
              id="file-upload"
              ref="fileInputRef"
              name="file-upload"
              type="file"
              class="sr-only"
              accept=".csv,.xlsx,.xls"
              :disabled="!selectedTenantId"
              @change="handleFileSelect"
            >
          </label>
          <p class="mt-[1.6rem] text-[1.2rem] text-slate-400">
            CSV, XLSX or XLS · Max 5MB · Up to 100 rows
          </p>
        </div>

        <!-- Error Feedback -->
        <div
          v-if="fileError"
          class="mt-[1.6rem] flex items-center gap-[0.8rem] rounded-[10px] border border-red-200 bg-red-50 p-[1.6rem] text-[1.4rem] text-red-700"
        >
          <span class="material-symbols-outlined shrink-0 text-red-600">error</span>
          <span>{{ fileError }}</span>
        </div>

        <!-- Target Fields -->
        <div class="mt-[2.4rem] flex flex-wrap items-center gap-[0.8rem]">
          <span
            v-for="field in targetFields"
            :key="field.key"
            class="inline-flex items-center gap-[0.4rem] rounded-full border px-[1.2rem] py-[0.4rem] text-[1.2rem] font-medium"
            :class="field.required ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-slate-200 bg-white text-slate-500'"
          >
            {{ field.label }}
            <span v-if="!field.required" class="text-slate-400">(optional)</span>
          </span>
        </div>
      </div>
    </div>

    <!-- STEP 2: COLUMN MAPPING -->
    <div v-if="importStore.currentStep === 2" class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem]">
      <div class="flex flex-col gap-[1.2rem] border-b border-slate-200 pb-[1.6rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-[1.8rem] font-bold text-slate-900">Map Columns to Product Fields</h2>
          <p class="mt-[0.2rem] text-[1.3rem] text-slate-500">
            Match columns from <strong>{{ importStore.fileName }}</strong> ({{ importStore.rawRows.length }} rows) for merchant <strong>{{ selectedMerchant?.businessTradingName || selectedTenantId }}</strong>.
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-[0.4rem] self-start text-[1.3rem] font-semibold text-slate-600 hover:text-slate-900 sm:self-auto cursor-pointer"
          @click="importStore.currentStep = 1"
        >
          <span class="material-symbols-outlined text-[1.6rem]">swap_horiz</span>
          Upload Different File
        </button>
      </div>

      <div class="mt-[1.6rem] divide-y divide-slate-100">
        <div
          v-for="field in targetFields"
          :key="field.key"
          class="grid grid-cols-1 items-center gap-[1.6rem] py-[1.6rem] md:grid-cols-12"
        >
          <div class="md:col-span-5">
            <div class="flex items-center gap-[0.8rem]">
              <span class="text-[1.4rem] font-semibold text-slate-900">{{ field.label }}</span>
              <span
                v-if="field.required"
                class="rounded border border-red-100 bg-red-50 px-[0.6rem] py-[0.2rem] text-[1.1rem] font-bold text-red-600"
              >
                REQUIRED
              </span>
              <span v-else class="text-[1.1rem] font-medium text-slate-400">OPTIONAL</span>
            </div>
            <p class="mt-[0.2rem] text-[1.3rem] text-slate-500">{{ field.description }}</p>
          </div>

          <div class="md:col-span-7">
            <SearchableSelectInput
              v-model="importStore.columnMapping[field.key]"
              :options="headerOptions"
              placeholder="Select matching column"
            />
          </div>
        </div>
      </div>

      <!-- Action bar -->
      <div class="mt-[2.4rem] flex items-center justify-between border-t border-slate-200 pt-[1.6rem]">
        <button
          type="button"
          class="rounded-[10px] border border-slate-300 px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          @click="importStore.currentStep = 1"
        >
          Back
        </button>

        <button
          type="button"
          class="flex items-center gap-[0.8rem] rounded-[10px] bg-primary px-[2.4rem] py-[0.8rem] text-[1.4rem] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          :disabled="!canProceedToPreview || importStore.isProcessing"
          @click="handleProceedToPreview"
        >
          <span v-if="importStore.isProcessing" class="material-symbols-outlined animate-spin text-[1.4rem]">progress_activity</span>
          <span>Proceed to Preview</span>
          <span v-if="!importStore.isProcessing" class="material-symbols-outlined text-[1.4rem]">arrow_forward</span>
        </button>
      </div>
    </div>

    <!-- STEP 3: PREVIEW & VALIDATE -->
    <div v-if="importStore.currentStep === 3" class="space-y-[1.6rem]">
      <!-- Polling / Processing Banner -->
      <div
        v-if="importStore.isPolling"
        class="rounded-[10px] border border-blue-200 bg-blue-50 p-[3.2rem] text-center shadow-sm"
      >
        <h2 class="text-[1.8rem] font-bold text-slate-900">Validating {{ importStore.rawRows.length }} rows for {{ selectedMerchant?.businessTradingName || "merchant" }}</h2>
        <p class="mt-[0.4rem] text-[1.4rem] text-slate-600">
          Running dry-run validation against catalog constraints.
        </p>

        <ul class="mx-auto mt-[2.4rem] flex max-w-md flex-col gap-[1.2rem] text-left">
          <li
            v-for="(stage, index) in activeWaitStages"
            :key="stage.label"
            class="flex items-center gap-[1.2rem]"
          >
            <span
              class="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full"
              :class="index < activeStageIndex ? 'bg-emerald-500 text-white' : index === activeStageIndex ? 'bg-primary text-white' : 'bg-blue-100 text-blue-300'"
            >
              <span v-if="index < activeStageIndex" class="material-symbols-outlined text-[1.4rem]">check</span>
              <span v-else-if="index === activeStageIndex" class="material-symbols-outlined animate-spin text-[1.4rem]">progress_activity</span>
              <span v-else class="h-[0.6rem] w-[0.6rem] rounded-full bg-current" />
            </span>
            <span
              class="text-[1.4rem]"
              :class="index <= activeStageIndex ? 'font-semibold text-slate-900' : 'text-slate-400'"
            >
              {{ stage.label }}
            </span>
          </li>
        </ul>

        <p v-if="isTakingLonger" class="mt-[2rem] text-[1.3rem] text-slate-500">
          Still processing — file validation is queued in the background.
        </p>
      </div>

      <!-- Preview Job Failed -->
      <div
        v-else-if="importStore.previewJob?.status === 'FAILED'"
        role="alert"
        class="rounded-[10px] border border-red-200 bg-red-50 p-[2.4rem] shadow-sm"
      >
        <div class="flex items-start gap-[1.2rem]">
          <span class="material-symbols-outlined text-[3rem] text-red-600">error</span>
          <div class="min-w-0">
            <h2 class="text-[1.8rem] font-bold text-red-900">Preview validation failed</h2>
            <p class="mt-[0.4rem] break-words text-[1.4rem] text-red-700">
              {{ importStore.previewJob.errorMessage || "Unable to validate this spreadsheet. Please review your column mappings." }}
            </p>
            <div class="mt-[1.6rem] flex flex-wrap gap-[1rem]">
              <button
                type="button"
                class="inline-flex items-center gap-[0.6rem] rounded-[8px] bg-red-700 px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                :disabled="importStore.isProcessing"
                @click="handleProceedToPreview"
              >
                <span class="material-symbols-outlined text-[1.6rem]">refresh</span>
                Retry validation
              </button>
              <button
                type="button"
                class="rounded-[8px] border border-red-300 bg-white px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
                @click="importStore.currentStep = 2"
              >
                Back to mapping
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Results Displayed when completed -->
      <div v-else-if="importStore.previewJob?.status === 'COMPLETED'" class="space-y-[1.6rem]">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-3">
          <div class="rounded-[10px] border border-slate-200 bg-white p-[2rem] shadow-sm">
            <span class="text-[1.2rem] font-bold uppercase tracking-wider text-slate-500">Total Rows</span>
            <p class="mt-[0.8rem] text-[2rem] font-bold text-slate-900">{{ importStore.previewJob.summary?.totalRows || 0 }}</p>
          </div>

          <div class="rounded-[10px] border border-emerald-200 bg-emerald-50/50 p-[2rem] shadow-sm">
            <span class="text-[1.2rem] font-bold uppercase tracking-wider text-emerald-700">Valid Rows</span>
            <p class="mt-[0.8rem] text-[2rem] font-bold text-emerald-800">{{ importStore.previewJob.summary?.validRows || 0 }}</p>
          </div>

          <div class="rounded-[10px] border border-red-200 bg-red-50/50 p-[2rem] shadow-sm">
            <span class="text-[1.2rem] font-bold uppercase tracking-wider text-red-700">Invalid Rows</span>
            <p class="mt-[0.8rem] text-[2rem] font-bold text-red-800">{{ importStore.previewJob.summary?.invalidRows || 0 }}</p>
          </div>
        </div>

        <div
          v-if="importStore.isCheckingImages"
          role="status"
          class="flex items-center gap-[0.8rem] border-l-4 border-blue-500 bg-blue-50 px-[1.6rem] py-[1.2rem] text-[1.3rem] text-blue-800"
        >
          <span class="material-symbols-outlined animate-spin text-[1.6rem]">progress_activity</span>
          Checking image reachability...
        </div>

        <!-- SKU Collision Alert Banner -->
        <div
          v-if="blockedCollisionRows.length > 0"
          class="flex flex-col gap-[0.8rem] sm:flex-row sm:items-center sm:justify-between rounded-[10px] border border-amber-200 bg-amber-50 p-[1.6rem] text-[1.4rem] text-amber-900 shadow-sm"
        >
          <div class="flex items-center gap-[0.8rem]">
            <span class="material-symbols-outlined shrink-0 text-amber-600 text-[2.2rem]">warning</span>
            <div>
              <p class="font-semibold">
                {{ blockedCollisionRows.length }} product{{ blockedCollisionRows.length > 1 ? 's have' : ' has' }} colliding SKUs
              </p>
              <p class="text-[1.3rem] text-amber-700">
                Accept suggested suffixes or edit them in the table below before committing.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-[0.6rem] rounded-[8px] border border-amber-300 bg-white px-[1.4rem] py-[0.6rem] text-[1.3rem] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
            :disabled="importStore.isProcessing"
            @click="importStore.revalidatePreview(selectedTenantId)"
          >
            <span v-if="importStore.isProcessing" class="material-symbols-outlined animate-spin text-[1.4rem]">progress_activity</span>
            <span v-else class="material-symbols-outlined text-[1.6rem]">refresh</span>
            Re-validate
          </button>
        </div>

        <!-- Sampled Visual Preview -->
        <div v-if="sampledPreviewRows.length > 0" class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem] shadow-sm">
          <div class="border-b border-slate-100 pb-[1.2rem]">
            <h3 class="text-[1.4rem] font-bold uppercase tracking-wider text-slate-900">
              Visual Sample Preview ({{ sampledPreviewRows.length }} valid products)
            </h3>
          </div>
          <div class="mt-[1.6rem] grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="item in sampledPreviewRows"
              :key="item.rowNumber"
              class="flex flex-col justify-between rounded-[10px] border border-slate-200 bg-slate-50/50 p-[1.2rem]"
            >
              <div>
                <div class="flex h-[11.2rem] w-full items-center justify-center overflow-hidden rounded-[8px] bg-slate-200">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    alt=""
                    class="h-full w-full object-cover"
                    @error="(e) => e.target.style.display = 'none'"
                  >
                  <span v-else class="material-symbols-outlined text-[3rem] text-slate-400">image</span>
                </div>
                <h4 class="mt-[0.8rem] truncate text-[1.4rem] font-semibold text-slate-900" :title="item.name">{{ item.name }}</h4>
                <p class="text-[1.3rem] text-slate-500">{{ item.category }}</p>
                <div v-if="item.tags && item.tags.length > 0" class="mt-[0.6rem] flex flex-wrap gap-[0.4rem]">
                  <span
                    v-for="(tag, idx) in item.tags.slice(0, 2)"
                    :key="idx"
                    class="rounded-full bg-slate-200/80 px-[0.6rem] py-[0.1rem] text-[1rem] text-slate-700"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="item.tags.length > 2" class="text-[1rem] text-slate-500">
                    +{{ item.tags.length - 2 }}
                  </span>
                </div>
              </div>
              <div class="mt-[0.8rem] flex items-center justify-between border-t border-slate-200 pt-[0.8rem]">
                <div class="flex flex-col">
                  <span class="text-[1.3rem] font-bold text-slate-900">{{ formatMoney(item.price) }}</span>
                  <span v-if="item.costPrice !== null && item.costPrice !== undefined" class="text-[1.1rem] text-slate-500">
                    Cost: {{ formatMoney(item.costPrice) }}
                  </span>
                </div>
                <span class="text-[1.1rem] text-slate-400">Row #{{ item.rowNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Per-Row Results DataTable -->
        <div class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem] shadow-sm">
          <h3 class="mb-[1.6rem] text-[1.4rem] font-bold uppercase tracking-wider text-slate-900">
            Full Row Validation Table
          </h3>

          <!-- Filters -->
          <div class="mb-[1.6rem] flex flex-col gap-[1.2rem] sm:flex-row sm:flex-wrap sm:items-center">
            <div class="relative min-w-[22rem] flex-1">
              <span class="material-symbols-outlined absolute left-[1.2rem] top-1/2 -translate-y-1/2 text-[1.6rem] text-slate-400">search</span>
              <input
                v-model="previewFilters.search"
                type="text"
                placeholder="Search by product name"
                class="w-full rounded-[10px] border border-slate-200 py-[0.8rem] pl-[3.6rem] pr-[1.2rem] text-[1.4rem] text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
              >
            </div>

            <select
              v-model="previewFilters.category"
              class="rounded-[10px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.4rem] text-slate-700 focus:border-primary focus:outline-none bg-white"
            >
              <option value="">All Categories</option>
              <option v-for="category in previewCategories" :key="category" :value="category">{{ category }}</option>
            </select>

            <select
              v-model="previewFilters.status"
              class="rounded-[10px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.4rem] text-slate-700 focus:border-primary focus:outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
              <option value="collision">Collisions ({{ totalCollisionRows.length }})</option>
            </select>

            <button
              v-if="hasActivePreviewFilters"
              type="button"
              class="text-[1.3rem] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
              @click="resetPreviewFilters"
            >
              Reset filters
            </button>
          </div>

          <DataTable
            :table-header="previewTableHeaders"
            :table-data="filteredPreviewRows"
            :loading="false"
          >
            <template #cell(sku)="{ value, row }">
              <div class="flex flex-col gap-[0.2rem]">
                <div class="flex items-center gap-[0.6rem]">
                  <span v-if="value" class="font-mono text-[1.3rem] font-medium text-slate-800">{{ value }}</span>
                  <span v-else class="text-[1.2rem] italic text-slate-400">Auto-generated</span>
                  <span
                    v-if="row.duplicateGroupCode && row.valid"
                    class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-semibold text-emerald-700"
                  >
                    Auto-suffixed
                  </span>
                  <span
                    v-else-if="row.duplicateGroupCode && !row.valid"
                    class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-semibold text-amber-700"
                  >
                    Collision
                  </span>
                </div>
                <span v-if="row.duplicateGroupCode" class="font-mono text-[1.1rem] text-slate-400">
                  {{ row.duplicateGroupCode }}
                </span>
              </div>
            </template>

            <template #cell(price)="{ value }">
              <span>{{ formatMoney(value) }}</span>
            </template>

            <template #cell(costPrice)="{ value }">
              <span v-if="value !== null && value !== undefined">{{ formatMoney(value) }}</span>
              <span v-else class="text-slate-400">—</span>
            </template>

            <template #cell(tags)="{ value }">
              <div v-if="value && value.length > 0" class="flex flex-wrap gap-[0.4rem] max-w-[20rem]">
                <span
                  v-for="(tag, idx) in value.slice(0, 3)"
                  :key="idx"
                  class="inline-flex items-center rounded-full bg-slate-100 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-medium text-slate-700"
                >
                  {{ tag }}
                </span>
                <span
                  v-if="value.length > 3"
                  class="inline-flex items-center rounded-full bg-slate-200 px-[0.6rem] py-[0.1rem] text-[1.1rem] font-semibold text-slate-600"
                  :title="value.slice(3).join(', ')"
                >
                  +{{ value.length - 3 }}
                </span>
              </div>
              <span v-else class="text-slate-400">—</span>
            </template>

            <template #cell(category)="{ value, row }">
              <span class="inline-flex items-center gap-[0.6rem]">
                <span>{{ value }}</span>
                <span
                  v-if="row.newCategory"
                  class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-[0.8rem] py-[0.1rem] text-[1.1rem] font-semibold text-blue-700"
                  title="New category — will be created automatically"
                >
                  New
                </span>
              </span>
            </template>

            <template #cell(status)="{ row }">
              <span
                v-if="row.valid"
                class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-[1rem] py-[0.2rem] text-[1.3rem] font-semibold text-emerald-700"
              >
                Valid
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-[1rem] py-[0.2rem] text-[1.3rem] font-semibold text-red-700"
              >
                Invalid
              </span>
            </template>

            <template #cell(imageCheckStatus)="{ row }">
              <span v-if="row.imageCheckStatus === 'LOADS'" class="font-semibold text-emerald-700">Loads</span>
              <span v-else-if="row.imageCheckStatus === 'FAILED'" class="font-semibold text-amber-700">Could not load</span>
              <span v-else-if="row.imageCheckStatus === 'TIMED_OUT'" class="font-semibold text-amber-700">Timed out</span>
              <span v-else-if="row.imageCheckStatus === 'CHECKING'" class="text-blue-700">Checking...</span>
              <span v-else class="text-slate-400">Not provided</span>
            </template>

            <template #cell(errors)="{ row }">
              <div v-if="row.errors && row.errors.length > 0" class="space-y-[0.4rem] text-[1.3rem] text-red-600">
                <div v-for="(err, idx) in row.errors" :key="idx" class="flex items-center gap-[0.4rem]">
                  <span class="material-symbols-outlined text-[1.3rem]">close</span>
                  <span>{{ err }}</span>
                </div>

                <!-- Blocked SKU collision affordance -->
                <div
                  v-if="row.suggestedSku && !row.valid"
                  class="mt-[0.8rem] rounded-[8px] border border-amber-200 bg-amber-50/70 p-[1rem] text-slate-800 space-y-[0.8rem]"
                >
                  <div class="flex flex-wrap items-center gap-[0.8rem]">
                    <button
                      type="button"
                      class="inline-flex items-center gap-[0.4rem] rounded-[6px] bg-emerald-600 px-[1rem] py-[0.4rem] text-[1.2rem] font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                      @click="handleAcceptSuffix(row.rowNumber, row.suggestedSku)"
                    >
                      <span class="material-symbols-outlined text-[1.4rem]">check</span>
                      Use suggested: {{ row.suggestedSku }}
                    </button>

                    <button
                      v-if="editingSkuRowNumber !== row.rowNumber"
                      type="button"
                      class="inline-flex items-center gap-[0.4rem] rounded-[6px] border border-slate-300 bg-white px-[1rem] py-[0.4rem] text-[1.2rem] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      @click="startEditingSku(row.rowNumber, row.sku)"
                    >
                      <span class="material-symbols-outlined text-[1.4rem]">edit</span>
                      Edit SKU
                    </button>
                  </div>

                  <div
                    v-if="editingSkuRowNumber === row.rowNumber"
                    class="flex items-center gap-[0.6rem] pt-[0.4rem]"
                  >
                    <input
                      v-model="editingSkuValue"
                      type="text"
                      class="w-[18rem] rounded-[6px] border border-slate-300 bg-white px-[0.8rem] py-[0.4rem] text-[1.2rem] font-mono text-slate-900 focus:border-primary focus:outline-none"
                      placeholder="Enter custom SKU"
                      @keyup.enter="saveEditingSku(row.rowNumber)"
                      @keyup.esc="cancelEditingSku"
                    >
                    <button
                      type="button"
                      class="rounded-[6px] bg-primary px-[1rem] py-[0.4rem] text-[1.2rem] font-semibold text-white hover:bg-blue-700 cursor-pointer"
                      @click="saveEditingSku(row.rowNumber)"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      class="rounded-[6px] border border-slate-300 bg-white px-[0.8rem] py-[0.4rem] text-[1.2rem] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                      @click="cancelEditingSku"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              <span v-else class="text-[1.3rem] text-slate-400">Ready to import</span>
            </template>
          </DataTable>
        </div>

        <!-- Action bar -->
        <div class="flex items-center justify-between rounded-[10px] border border-slate-200 bg-white p-[1.6rem] shadow-sm">
          <button
            type="button"
            class="rounded-[10px] border border-slate-300 px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            @click="importStore.currentStep = 2"
          >
            Back to Mapping
          </button>

          <button
            type="button"
            class="flex items-center gap-[0.8rem] rounded-[10px] bg-emerald-600 px-[2.4rem] py-[0.8rem] text-[1.4rem] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            :disabled="importStore.previewJob.summary?.validRows === 0 || importStore.isProcessing"
            @click="handleCommitImport"
          >
            <span v-if="importStore.isProcessing" class="material-symbols-outlined animate-spin text-[1.4rem]">progress_activity</span>
            <span>Import {{ importStore.previewJob.summary?.validRows || 0 }} Valid Products</span>
            <span v-if="!importStore.isProcessing" class="material-symbols-outlined text-[1.4rem]">check_circle</span>
          </button>
        </div>
      </div>
    </div>

    <!-- STEP 4: COMMIT & OUTCOMES -->
    <div v-if="importStore.currentStep === 4" class="space-y-[1.6rem]">
      <!-- Polling / Processing Banner -->
      <div
        v-if="importStore.isPolling"
        class="rounded-[10px] border border-blue-200 bg-blue-50 p-[3.2rem] text-center shadow-sm"
      >
        <h2 class="text-[1.8rem] font-bold text-slate-900">Creating products for {{ selectedMerchant?.businessTradingName || "merchant" }}</h2>
        <p class="mt-[0.4rem] text-[1.4rem] text-slate-600">
          The async background job is persisting validated products into the catalog.
        </p>

        <ul class="mx-auto mt-[2.4rem] flex max-w-md flex-col gap-[1.2rem] text-left">
          <li
            v-for="(stage, index) in activeWaitStages"
            :key="stage.label"
            class="flex items-center gap-[1.2rem]"
          >
            <span
              class="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full"
              :class="index < activeStageIndex ? 'bg-emerald-500 text-white' : index === activeStageIndex ? 'bg-primary text-white' : 'bg-blue-100 text-blue-300'"
            >
              <span v-if="index < activeStageIndex" class="material-symbols-outlined text-[1.4rem]">check</span>
              <span v-else-if="index === activeStageIndex" class="material-symbols-outlined animate-spin text-[1.4rem]">progress_activity</span>
              <span v-else class="h-[0.6rem] w-[0.6rem] rounded-full bg-current" />
            </span>
            <span
              class="text-[1.4rem]"
              :class="index <= activeStageIndex ? 'font-semibold text-slate-900' : 'text-slate-400'"
            >
              {{ stage.label }}
            </span>
          </li>
        </ul>

        <p v-if="isTakingLonger" class="mt-[2rem] text-[1.3rem] text-slate-500">
          Still processing batch...
        </p>
      </div>

      <div
        v-else-if="importStore.commitJob?.status === 'FAILED'"
        role="alert"
        class="rounded-[10px] border border-red-200 bg-red-50 p-[2.4rem] shadow-sm"
      >
        <div class="flex items-start gap-[1.2rem]">
          <span class="material-symbols-outlined text-[3rem] text-red-600">error</span>
          <div class="min-w-0">
            <h2 class="text-[1.8rem] font-bold text-red-900">Import job failed</h2>
            <p class="mt-[0.4rem] break-words text-[1.4rem] text-red-700">
              {{ importStore.commitJob.errorMessage || "No products were confirmed as created." }}
            </p>
            <div class="mt-[1.6rem] flex flex-wrap gap-[1rem]">
              <button
                type="button"
                class="inline-flex items-center gap-[0.6rem] rounded-[8px] bg-red-700 px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-white hover:bg-red-800 cursor-pointer"
                :disabled="importStore.isProcessing"
                @click="handleCommitImport"
              >
                <span class="material-symbols-outlined text-[1.6rem]">refresh</span>
                Retry import
              </button>
              <button
                type="button"
                class="rounded-[8px] border border-red-300 bg-white px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
                @click="importStore.currentStep = 3"
              >
                Back to preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Outcome Screen -->
      <div v-else-if="importStore.commitJob?.status === 'COMPLETED'" class="space-y-[1.6rem]">
        <div class="rounded-[10px] border border-emerald-200 bg-emerald-50 p-[2.4rem] shadow-sm">
          <div class="flex items-center gap-[1.2rem]">
            <span class="material-symbols-outlined text-[3rem] text-emerald-600">check_circle</span>
            <div>
              <h2 class="text-[1.8rem] font-bold text-emerald-900">Import Job Finished</h2>
              <p class="text-[1.4rem] text-emerald-700">
                Created <strong>{{ importStore.commitJob.summary?.importedRows || 0 }}</strong> products successfully for <strong>{{ selectedMerchant?.businessTradingName || selectedTenantId }}</strong>.
                <span v-if="importStore.commitJob.summary?.failedRows > 0">
                  ({{ importStore.commitJob.summary?.failedRows }} rows failed).
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Outcome DataTable -->
        <div class="rounded-[10px] border border-slate-200 bg-white p-[2.4rem] shadow-sm">
          <h3 class="mb-[1.6rem] text-[1.4rem] font-bold uppercase tracking-wider text-slate-900">
            Final Import Results
          </h3>
          <DataTable
            :table-header="commitTableHeaders"
            :table-data="importStore.commitJob.rows || []"
            :loading="false"
          >
            <template #cell(status)="{ row }">
              <span
                v-if="row.valid && row.productId"
                class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-[1rem] py-[0.2rem] text-[1.3rem] font-semibold text-emerald-700"
              >
                Success
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-[1rem] py-[0.2rem] text-[1.3rem] font-semibold text-red-700"
              >
                Failed
              </span>
            </template>

            <template #cell(productId)="{ value }">
              <span v-if="value" class="font-mono text-[1.3rem] text-slate-600">{{ value }}</span>
              <span v-else class="text-[1.3rem] text-slate-400">—</span>
            </template>

            <template #cell(errors)="{ row }">
              <div v-if="row.errors && row.errors.length > 0" class="space-y-[0.2rem] text-[1.3rem] text-red-600">
                <div v-for="(err, idx) in row.errors" :key="idx" class="flex items-center gap-[0.4rem]">
                  <span class="material-symbols-outlined text-[1.3rem]">close</span>
                  <span>{{ err }}</span>
                </div>
              </div>
              <span v-else class="text-[1.3rem] font-medium text-emerald-700">Product created</span>
            </template>
          </DataTable>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between rounded-[10px] border border-slate-200 bg-white p-[1.6rem] shadow-sm">
          <button
            type="button"
            class="rounded-[10px] border border-slate-300 px-[1.6rem] py-[0.8rem] text-[1.4rem] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            @click="importStore.reset(selectedTenantId)"
          >
            Import Another Batch
          </button>

          <NuxtLink
            :to="`/dashboard/merchants/${selectedTenantId}`"
            class="rounded-[10px] bg-primary px-[2.4rem] py-[0.8rem] text-[1.4rem] font-semibold text-white shadow-sm hover:bg-blue-700 inline-flex items-center gap-[0.6rem]"
          >
            <span>View Merchant Details</span>
            <span class="material-symbols-outlined text-[1.6rem]">arrow_forward</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
