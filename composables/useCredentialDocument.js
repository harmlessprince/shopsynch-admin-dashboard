import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

const MESSAGE_BY_STATUS = {
    404: "This document could not be found. Ask the merchant to upload it again.",
    429: "Too many documents opened in a short time. Please wait a minute and try again.",
    503: "The document could not be retrieved right now. Please try again in a moment.",
};

/**
 * Loads a merchant's identity or compliance document through the authenticated content endpoint. The document comes
 * back as bytes and is shown from a local object URL; there is no link to the stored file. The caller owns the object
 * URL and must release it with {@link releaseCredentialDocument} when the document is closed.
 */
export const useCredentialDocument = () => {
    const { get } = useApiService();

    /**
     * @returns {Promise<{objectUrl: string, contentType: string}>}
     * @throws {Error} with a message that can be shown to the reviewer as it is
     */
    async function loadCredentialDocument(fileId) {
        try {
            const url = endpoints.admin.files.credentialContent.replace(":fileId", fileId);
            const blob = await get(url, {}, { forceMode: "live", responseType: "blob" });
            return { objectUrl: URL.createObjectURL(blob), contentType: blob.type };
        } catch (error) {
            const status = error?.response?.status || error?.statusCode;
            throw new Error(MESSAGE_BY_STATUS[status] || "The document could not be loaded. Please try again.");
        }
    }

    function releaseCredentialDocument(objectUrl) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }

    return { loadCredentialDocument, releaseCredentialDocument };
};
