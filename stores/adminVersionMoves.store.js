import { defineStore } from "pinia";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";
import {
    versionMovePreviewSchema,
    versionMoveConfirmSchema,
    versionMoveCancelSchema,
} from "~/schemas/versionMove.schema";

function normalizeFieldErrors(errors) {
    const result = {};
    for (const [field, message] of Object.entries(errors || {})) {
        result[field] = Array.isArray(message) ? message.join(" ") : String(message);
    }
    return result;
}

export const useAdminVersionMovesStore = defineStore("adminVersionMovesStore", () => {
    const { get, post } = useApiService();
    const toastStore = useToastStore();

    const moves = ref([]);
    const loading = ref(false);
    const loadError = ref("");
    const saving = ref(false);
    const preview = ref(null);
    const fieldErrors = ref({});
    const actionError = ref("");

    function clearErrors() {
        fieldErrors.value = {};
        actionError.value = "";
    }

    function fieldError(name) {
        const entries = Object.entries(fieldErrors.value);
        const exact = entries.find(([key]) => key === name);
        if (exact) return exact[1];
        const nested = entries.find(([key]) => key.startsWith(`${name}.`) || key.startsWith(`${name}[`));
        return nested ? nested[1] : "";
    }

    function parse(schema, raw) {
        const result = schema.safeParse(raw);
        if (result.success) return result.data;
        const errors = {};
        for (const issue of result.error.issues) {
            const key = issue.path.join(".") || "form";
            if (!errors[key]) errors[key] = issue.message;
        }
        fieldErrors.value = errors;
        return null;
    }

    async function runWrite(task, successMessage) {
        saving.value = true;
        clearErrors();
        try {
            const response = await task();
            if (successMessage) toastStore.success(successMessage, "");
            return response?.data ?? null;
        } catch (err) {
            logger.error("Version move request failed", err);
            const status = err?.response?.status || err?.statusCode;
            const data = err?.data || err?.response?._data;
            if (status === 422 && data?.errors) {
                fieldErrors.value = normalizeFieldErrors(data.errors);
                actionError.value = Object.keys(fieldErrors.value).length ? "" : data?.message || "";
            } else {
                actionError.value = data?.message || "This could not be completed. Please try again.";
            }
            return null;
        } finally {
            saving.value = false;
        }
    }

    const opts = { forceMode: "live", silent: true };
    const withId = (url, moveId) => url.replace(":moveId", encodeURIComponent(moveId));

    function resetPreview() {
        preview.value = null;
        clearErrors();
    }

    async function fetchMoves() {
        loading.value = true;
        loadError.value = "";
        try {
            const response = await get(endpoints.admin.billing.versionMoves.list, {}, opts);
            moves.value = response?.data || [];
        } catch (err) {
            logger.error("Failed to load version moves", err);
            loadError.value = err?.data?.message || "The version moves could not be loaded.";
        } finally {
            loading.value = false;
        }
    }

    // The list may leave rows out; the single-move read carries them.
    async function fetchMove(moveId) {
        try {
            const response = await get(withId(endpoints.admin.billing.versionMoves.one, moveId), {}, opts);
            const move = response?.data;
            if (!move) return null;
            const index = moves.value.findIndex((m) => m.id === moveId);
            if (index >= 0) moves.value[index] = move;
            else moves.value.push(move);
            return move;
        } catch (err) {
            logger.error("Failed to load the version move", err);
            return null;
        }
    }

    // The dry run changes nothing; the API lists every merchant it would touch or skip.
    async function previewMove(raw) {
        clearErrors();
        preview.value = null;
        const payload = parse(versionMovePreviewSchema, raw);
        if (!payload) return null;
        const result = await runWrite(() => post(endpoints.admin.billing.versionMoves.preview, payload, opts));
        preview.value = result;
        return result;
    }

    async function confirmMove(raw) {
        clearErrors();
        const payload = parse(versionMoveConfirmSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(() => post(endpoints.admin.billing.versionMoves.confirm, payload, opts), "Move confirmed");
        if (saved) {
            preview.value = null;
            await fetchMoves();
        }
        return saved;
    }

    async function cancelMove(moveId, raw) {
        clearErrors();
        const payload = parse(versionMoveCancelSchema, raw);
        if (!payload) return null;
        const saved = await runWrite(() => post(withId(endpoints.admin.billing.versionMoves.cancel, moveId), payload, opts), "Move cancelled");
        if (saved) {
            await fetchMoves();
            await fetchMove(moveId);
        }
        return saved;
    }

    return {
        moves,
        loading,
        loadError,
        saving,
        preview,
        fieldErrors,
        actionError,
        clearErrors,
        fieldError,
        resetPreview,
        fetchMoves,
        fetchMove,
        previewMove,
        confirmMove,
        cancelMove,
    };
});
