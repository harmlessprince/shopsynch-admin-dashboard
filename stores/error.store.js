import {ref} from "vue";
import {defineStore} from "pinia";

export const useErrorStore = defineStore("errorStore", () => {
    const errorMessage = ref(null);
    const validationErrors = ref(null);
    const serverError = ref(false);

    function resetErrors() {
        errorMessage.value = null;
        validationErrors.value = [];
        serverError.value = false
    }

    function setErrorMessage(message) {
        errorMessage.value = message;
    }

    function setValidationErrors(errors) {
        validationErrors.value = errors;
    }

    function setServerError(isServerError) {
        serverError.value = isServerError;
    }

    function getErrorMessage() {
        return errorMessage.value;
    }

    function getValidationError() {
        return validationErrors.value;
    }

    function getServerError() {
        return serverError.value;
    }

    return {
        setErrorMessage,
        setServerError,
        setValidationErrors,
        getErrorMessage,
        getServerError,
        getValidationError,
        resetErrors,
    };
});
