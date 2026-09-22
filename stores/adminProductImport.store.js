import { defineStore } from "pinia";
import { ref } from "vue";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { endpoints } from "~/utils/endpoints.js";
import { logger } from "~/utils/helpers.js";

export const useAdminProductImportStore = defineStore("adminProductImportStore", () => {
  const { get, post } = useApiService();
  const toastStore = useToastStore();

  const selectedTenantId = ref("");

  // Wizard progression: 1 (Upload) -> 2 (Map) -> 3 (Preview) -> 4 (Commit)
  const currentStep = ref(1);

  // File metadata & parsed rows
  const fileName = ref("");
  const fileHeaders = ref([]);
  const rawRows = ref([]);

  // Mapping from target field to file header name
  const columnMapping = ref({
    name: "",
    description: "",
    price: "",
    costPrice: "",
    category: "",
    sku: "",
    quantity: "",
    image: "",
    tags: "",
  });

  // Loading & polling state
  const isProcessing = ref(false);
  const isPolling = ref(false);
  let pollTimer = null;

  // Preview job state
  const previewJobId = ref(null);
  const previewJob = ref(null);
  const isCheckingImages = ref(false);
  let imageCheckRun = 0;

  // Commit job state
  const commitJobId = ref(null);
  const commitJob = ref(null);

  // Per-row resolution overrides (e.g. edited SKU, autoSuffix: true)
  const rowOverrides = ref({});

  // Draft persistence flag
  const hasRestoredDraft = ref(false);

  function getDraftKey(tenantId) {
    return `shopsynch_admin_bulk_import_draft_${tenantId || "default"}`;
  }

  function saveDraft(tenantId) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const draft = {
        selectedTenantId: selectedTenantId.value,
        fileName: fileName.value,
        fileHeaders: fileHeaders.value,
        rawRows: rawRows.value,
        columnMapping: columnMapping.value,
        rowOverrides: rowOverrides.value,
        currentStep: currentStep.value,
        timestamp: Date.now(),
      };
      window.localStorage.setItem(getDraftKey(tenantId), JSON.stringify(draft));
    } catch (e) {
      logger.warn("Failed to persist bulk import draft", e);
    }
  }

  function restoreDraft(tenantId) {
    if (typeof window === "undefined" || !window.localStorage) return false;
    try {
      const stored = window.localStorage.getItem(getDraftKey(tenantId));
      if (!stored) return false;
      const draft = JSON.parse(stored);
      if (!draft.rawRows || draft.rawRows.length === 0) return false;

      selectedTenantId.value = draft.selectedTenantId || tenantId || "";
      fileName.value = draft.fileName || "";
      fileHeaders.value = draft.fileHeaders || [];
      rawRows.value = draft.rawRows || [];
      columnMapping.value = {
        name: draft.columnMapping?.name || "",
        description: draft.columnMapping?.description || "",
        price: draft.columnMapping?.price || "",
        costPrice: draft.columnMapping?.costPrice || "",
        category: draft.columnMapping?.category || "",
        sku: draft.columnMapping?.sku || "",
        quantity: draft.columnMapping?.quantity || "",
        image: draft.columnMapping?.image || "",
        tags: draft.columnMapping?.tags || "",
      };
      rowOverrides.value = draft.rowOverrides || {};
      currentStep.value = draft.currentStep || 2;
      hasRestoredDraft.value = true;
      return true;
    } catch (e) {
      logger.warn("Failed to restore bulk import draft", e);
      return false;
    }
  }

  function clearDraft(tenantId) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.removeItem(getDraftKey(tenantId));
      hasRestoredDraft.value = false;
    } catch (e) {
      logger.warn("Failed to clear bulk import draft", e);
    }
  }

  function cleanNumericString(rawValue, { allowDecimal }) {
    const trimmed = String(rawValue).trim();
    const isNegative = trimmed.startsWith("-");
    const digitsPattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;
    const digitsOnly = trimmed.replace(digitsPattern, "");
    return isNegative ? `-${digitsOnly}` : digitsOnly;
  }

  function buildMappedRows() {
    return rawRows.value.map((row, index) => {
      const rowNumber = index + 1;
      const nameVal = columnMapping.value.name ? String(row[columnMapping.value.name] ?? "").trim() : "";
      const descVal = columnMapping.value.description ? String(row[columnMapping.value.description] ?? "").trim() : "";
      const catVal = columnMapping.value.category ? String(row[columnMapping.value.category] ?? "").trim() : "";
      const skuVal = columnMapping.value.sku ? String(row[columnMapping.value.sku] ?? "").trim() : "";
      const imgVal = columnMapping.value.image ? String(row[columnMapping.value.image] ?? "").trim() : "";

      const rawPrice = columnMapping.value.price ? row[columnMapping.value.price] : null;
      let priceVal = null;
      if (rawPrice !== null && rawPrice !== undefined && rawPrice !== "") {
        const parsed = parseFloat(cleanNumericString(rawPrice, { allowDecimal: true }));
        if (!isNaN(parsed)) priceVal = parsed;
      }

      const rawCostPrice = columnMapping.value.costPrice ? row[columnMapping.value.costPrice] : null;
      let costPriceVal = null;
      if (rawCostPrice !== null && rawCostPrice !== undefined && rawCostPrice !== "") {
        const parsed = parseFloat(cleanNumericString(rawCostPrice, { allowDecimal: true }));
        if (!isNaN(parsed)) costPriceVal = parsed;
      }

      const rawQty = columnMapping.value.quantity ? row[columnMapping.value.quantity] : null;
      let qtyVal = null;
      if (rawQty !== null && rawQty !== undefined && rawQty !== "") {
        const parsed = parseInt(cleanNumericString(rawQty, { allowDecimal: false }), 10);
        if (!isNaN(parsed)) qtyVal = parsed;
      }

      const rawTags = columnMapping.value.tags ? row[columnMapping.value.tags] : null;
      let tagsVal = [];
      if (Array.isArray(rawTags)) {
        tagsVal = rawTags.map(t => String(t).trim()).filter(Boolean);
      } else if (rawTags !== null && rawTags !== undefined && String(rawTags).trim() !== "") {
        tagsVal = String(rawTags)
          .split(",")
          .map(t => t.trim())
          .filter(Boolean);
      }

      const override = rowOverrides.value[rowNumber] || {};
      const finalSku = override.sku !== undefined ? override.sku : skuVal;
      const autoSuffixVal = override.autoSuffix !== undefined ? override.autoSuffix : undefined;

      const mappedRow = {
        rowNumber,
        name: nameVal,
        description: descVal,
        price: priceVal,
        costPrice: costPriceVal,
        category: catVal,
        sku: finalSku,
        quantity: qtyVal,
        image: imgVal,
        tags: tagsVal,
      };

      if (autoSuffixVal !== undefined) {
        mappedRow.autoSuffix = autoSuffixVal;
      }

      return mappedRow;
    });
  }

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    isPolling.value = false;
  }

  async function pollStatus(tenantId, jobId, onComplete) {
    stopPolling();
    isPolling.value = true;

    async function tick() {
      try {
        const endpoint = endpoints.admin.productImport.status
          .replace(":tenantId", tenantId)
          .replace(":importJobId", jobId);
        const res = await get(endpoint, {}, { forceMode: "live" });
        if (res && res.data) {
          const status = res.data.status;
          if (status === "COMPLETED" || status === "FAILED") {
            stopPolling();
            if (onComplete) onComplete(res.data);
            return;
          }
        }
      } catch (err) {
        logger.error("Error polling import job status", err);
      }

      pollTimer = setTimeout(tick, 1500);
    }

    await tick();
  }

  async function initiatePreview(tenantId) {
    const tid = tenantId || selectedTenantId.value;
    if (!tid) {
      toastStore.error("Please select a target merchant first.", "");
      return;
    }
    isProcessing.value = true;
    try {
      const payload = {
        rows: buildMappedRows(),
      };
      const url = endpoints.admin.productImport.preview.replace(":tenantId", tid);
      const response = await post(url, payload, { forceMode: "live" });
      if (response && response.data && response.data.importJobId) {
        previewJobId.value = response.data.importJobId;
        currentStep.value = 3;
        await pollStatus(tid, previewJobId.value, (completedJob) => {
          previewJob.value = completedJob;
          if (completedJob.status === "COMPLETED") {
            checkPreviewImages();
          } else {
            toastStore.error("Preview validation failed", completedJob.errorMessage || "Please try again.");
          }
        });
      }
    } finally {
      isProcessing.value = false;
    }
  }

  function checkImage(url, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (status) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve(status);
      };
      const timer = setTimeout(() => {
        image.src = "";
        finish("TIMED_OUT");
      }, timeoutMs);
      image.onload = () => finish("LOADS");
      image.onerror = () => finish("FAILED");
      image.src = url;
    });
  }

  async function checkPreviewImages() {
    if (typeof window === "undefined" || typeof Image === "undefined" || !previewJob.value?.rows) return;

    const run = ++imageCheckRun;
    const rows = previewJob.value.rows.map((row) => ({
      ...row,
      imageCheckStatus: row.image ? "CHECKING" : "NOT_PROVIDED",
    }));
    previewJob.value = { ...previewJob.value, rows };

    const pendingIndexes = rows
      .map((row, index) => (row.image ? index : -1))
      .filter((index) => index >= 0);
    if (pendingIndexes.length === 0) return;

    isCheckingImages.value = true;
    let cursor = 0;
    const worker = async () => {
      while (cursor < pendingIndexes.length && run === imageCheckRun) {
        const rowIndex = pendingIndexes[cursor++];
        const status = await checkImage(rows[rowIndex].image);
        if (run !== imageCheckRun) return;
        rows[rowIndex] = { ...rows[rowIndex], imageCheckStatus: status };
        previewJob.value = { ...previewJob.value, rows: [...rows] };
      }
    };

    await Promise.all(Array.from({ length: Math.min(5, pendingIndexes.length) }, worker));
    if (run === imageCheckRun) isCheckingImages.value = false;
  }

  async function initiateCommit(tenantId) {
    const tid = tenantId || selectedTenantId.value;
    if (!tid) {
      toastStore.error("Please select a target merchant first.", "");
      return;
    }
    isProcessing.value = true;
    try {
      const payload = {
        rows: buildMappedRows(),
        previewJobId: previewJobId.value,
      };
      const url = endpoints.admin.productImport.commit.replace(":tenantId", tid);
      const response = await post(url, payload, { forceMode: "live" });
      if (response && response.data && response.data.importJobId) {
        commitJobId.value = response.data.importJobId;
        currentStep.value = 4;
        await pollStatus(tid, commitJobId.value, (completedJob) => {
          commitJob.value = completedJob;
          if (completedJob.status === "COMPLETED") {
            clearDraft(tid);
            toastStore.success(`Import completed: ${completedJob.summary?.importedRows || 0} products created.`);
          } else {
            toastStore.error("Product import failed", completedJob.errorMessage || "Your draft is still available. Please try again.");
          }
        });
      }
    } finally {
      isProcessing.value = false;
    }
  }

  function acceptSuggestedSuffix(rowNumber, suggestedSku) {
    rowOverrides.value[rowNumber] = {
      ...rowOverrides.value[rowNumber],
      autoSuffix: true,
      sku: suggestedSku,
    };

    if (previewJob.value?.rows) {
      const targetRow = previewJob.value.rows.find((r) => r.rowNumber === rowNumber);
      if (targetRow) {
        targetRow.sku = suggestedSku;
        targetRow.autoSuffix = true;
        const originalErrors = targetRow.errors || [];
        targetRow.errors = originalErrors.filter(
          (err) => !err.toLowerCase().includes("sku") && !err.toLowerCase().includes("duplicate")
        );
        if (targetRow.errors.length === 0) {
          if (!targetRow.valid) {
            targetRow.valid = true;
            if (previewJob.value.summary) {
              previewJob.value.summary.validRows = (previewJob.value.summary.validRows || 0) + 1;
              previewJob.value.summary.invalidRows = Math.max(0, (previewJob.value.summary.invalidRows || 1) - 1);
            }
          }
        }
      }
    }
  }

  function updateRowSku(rowNumber, newSku) {
    const trimmed = (newSku || "").trim();
    rowOverrides.value[rowNumber] = {
      ...rowOverrides.value[rowNumber],
      sku: trimmed,
      autoSuffix: false,
    };

    if (previewJob.value?.rows) {
      const targetRow = previewJob.value.rows.find((r) => r.rowNumber === rowNumber);
      if (targetRow) {
        targetRow.sku = trimmed;
      }
    }
  }

  async function revalidatePreview(tenantId) {
    await initiatePreview(tenantId || selectedTenantId.value);
  }

  function reset(tenantId) {
    stopPolling();
    imageCheckRun += 1;
    currentStep.value = 1;
    fileName.value = "";
    fileHeaders.value = [];
    rawRows.value = [];
    columnMapping.value = {
      name: "",
      description: "",
      price: "",
      costPrice: "",
      category: "",
      sku: "",
      quantity: "",
      image: "",
      tags: "",
    };
    rowOverrides.value = {};
    previewJobId.value = null;
    previewJob.value = null;
    isCheckingImages.value = false;
    commitJobId.value = null;
    commitJob.value = null;
    isProcessing.value = false;
    clearDraft(tenantId || selectedTenantId.value);
  }

  return {
    selectedTenantId,
    currentStep,
    fileName,
    fileHeaders,
    rawRows,
    columnMapping,
    rowOverrides,
    isProcessing,
    isPolling,
    previewJobId,
    previewJob,
    isCheckingImages,
    commitJobId,
    commitJob,
    hasRestoredDraft,
    saveDraft,
    restoreDraft,
    clearDraft,
    buildMappedRows,
    initiatePreview,
    initiateCommit,
    acceptSuggestedSuffix,
    updateRowSku,
    revalidatePreview,
    pollStatus,
    stopPolling,
    reset,
  };
});
