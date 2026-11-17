import { ref, nextTick } from "vue";
import { useToastStore } from "~/stores/toast.store.js";
import { logger } from "~/utils/helpers.js";

// Shared write plumbing for the admin billing version stores (add-on catalogue, plan versions, cohort moves).

// 422 bodies name errors by field; a value may be a string or a list of strings.
export function normalizeFieldErrors(errors) {
    const result = {};
    for (const [field, message] of Object.entries(errors || {})) {
        result[field] = Array.isArray(message) ? message.join(" ") : String(message);
    }
    return result;
}

// Zod issue paths become the keys the API uses: prices.0.amount -> prices[0].amount.
export function zodFieldErrors(error) {
    const errors = {};
    for (const issue of error?.issues || []) {
        const key =
            issue.path.reduce((acc, part) => (typeof part === "number" ? `${acc}[${part}]` : acc ? `${acc}.${part}` : String(part)), "") ||
            "form";
        if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
}

export function useBillingWriteState(logLabel) {
    const toastStore = useToastStore();
    const saving = ref(false);
    // 422 field errors (or Zod issues) keyed by field name; 400 business refusals are plain text.
    const fieldErrors = ref({});
    const actionError = ref("");

    function clearErrors() {
        fieldErrors.value = {};
        actionError.value = "";
    }

    // First error for a field; a name also matches nested keys such as prices[0].amount or amountsByPeriodUnit.3.
    function fieldError(name) {
        const entries = Object.entries(fieldErrors.value);
        const exact = entries.find(([key]) => key === name);
        if (exact) return exact[1];
        const nested = entries.find(([key]) => key.startsWith(`${name}.`) || key.startsWith(`${name}[`));
        return nested ? nested[1] : "";
    }

    // Parse right before sending; the parsed value is what gets sent.
    function parse(schema, raw) {
        const result = schema.safeParse(raw);
        if (result.success) return result.data;
        fieldErrors.value = zodFieldErrors(result.error);
        return null;
    }

    // Runs a write with the global toast silenced so refusals show inline next to the action.
    async function runWrite(task, successMessage) {
        saving.value = true;
        clearErrors();
        try {
            const response = await task();
            if (successMessage) toastStore.success(successMessage, "");
            return response?.data ?? null;
        } catch (err) {
            logger.error(`${logLabel} request failed`, err);
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

    return { saving, fieldErrors, actionError, clearErrors, fieldError, parse, runWrite };
}

const matchesName = (key, name) => key === name || key.startsWith(`${name}.`) || key.startsWith(`${name}[`);

// Errors whose key is one of `names` or nested under it, as [{ key, message }] in API order.
export function errorsUnder(fieldErrors, names) {
    return Object.entries(fieldErrors || {})
        .filter(([key]) => names.some((name) => matchesName(key, name)))
        .map(([key, message]) => ({ key, message }));
}

// Errors no visible field shows: nothing in `visibleNames` matches them. A submit must never fail without a message.
export function unplacedErrors(fieldErrors, visibleNames) {
    return Object.entries(fieldErrors || {})
        .filter(([key]) => !visibleNames.some((name) => matchesName(key, name)))
        .map(([key, message]) => ({ key, message }));
}

// "featureAccessRules.website_customization" + "'website_customization' is not a recognized plan rule."
// -> "website_customization: is not a recognized plan rule"
export function readableError({ key, message }) {
    const leaf = key.replace(/^limits\./, "").split(".").slice(1).join(".") || key.replace(/^limits\./, "");
    const text = String(message).replace(new RegExp(`^'?${leaf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'?\\s+`), "").replace(/\.$/, "");
    return `${leaf}: ${text}`;
}

// After a failed submit, bring the first message (or invalid field) into view and focus it.
export async function focusFirstError(formEl) {
    await nextTick();
    const target = formEl?.querySelector('[data-form-error], [aria-invalid="true"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus?.({ preventScroll: true });
}
