import {defineStore} from "pinia";
import {ref} from "vue";
import {useApiService} from "~/services/apiService.js";
import {endpoints} from "~/utils/endpoints.js";

export const useComplianceStore = defineStore("complianceStore", () => {
    const {get, patch, post} = useApiService();
    const complianceStatus = ref({
        bankAccountVerified: null,
        contactDetailFilled: null,
        documentsVerified: null,
        kybCompleted: null,
        kycCompleted: null,
        profileDetailFilled: null,
        termsAccepted: null,
        pendingApproval: false,
        temporaryApproval: false,
        isStoreSetup: false,
        isDeliveryZoneSetup: false,
        hasVerifiedEmail: false,
        hasVerifiedPhone: false,
        complianceReviewStatus: 'NOT_SUBMITTED',
        complianceRejectionCode: null,
        complianceRejectionMessage: null,
        complianceNextSteps: null,
        complianceReviewedAt: null,
        complianceOverrideEnabled: false,
        complianceOverrideExpiresAt: null,
        businessType: 'starter',
    })

    const isLocked = computed(() => {
        const lockedStatuses = ['AWAITING_APPROVAL', 'UNDER_REVIEW', 'APPROVED'];
        return lockedStatuses.includes(complianceStatus.value.complianceReviewStatus);
    });

    const canGoLive = computed(() => {
        if (complianceStatus.value.complianceOverrideEnabled) {
            const expiresAt = complianceStatus.value.complianceOverrideExpiresAt;
            if (!expiresAt) return true;
            return new Date(expiresAt) > new Date();
        }
        return complianceStatus.value.complianceReviewStatus === 'APPROVED';
    });

    const allSectionsFilled = computed(() => {
        return !!(complianceStatus.value.kybCompleted && 
               complianceStatus.value.kycCompleted && 
               complianceStatus.value.contactDetailFilled && 
               complianceStatus.value.bankAccountVerified);
    });
    const businessProfile = ref({
        businessTradingName: '',
        legalBusinessName: '',
        businessType: '',
        businessRegistrationNumber: '',
        businessStorefrontUrl: '',
        businessDescription: '',
        industry: '',
        businessTaxIdNumber: '',
        businessExpectedMonthlyIncome: '',
        staffSize: 0,
    })
    const contactDetail = ref({
        businessCountry: '',
        businessCity: '',
        businessAddress: '',
        businessPrimaryPhoneNumber: '',
        businessSecondaryPhoneNumber: '',
        businessSupportEmailAddress: '',
        businessGeneralEmailAddress: '',
    })

    const businessOwnerDetail = ref({
        fullName: '',
        email: '',
        phoneNumber: '',
        idType: '',
        emailVerifiedAt: false,
        phoneVerifiedAt: false,
        address: '',
        proofOfAddressUploaded: false,
        idUploaded: false
    })

    const banks = ref([])
    const bankAccounts = ref([])

    async function fetchBusinessProfile() {
        const response = await get(endpoints.compliance.getBusinessProfile, {}, {forceMode: 'live'})
        if (response?.data) businessProfile.value = { ...businessProfile.value, ...response.data };
    }

    async function updateBusinessProfile(data) {
        await patch(endpoints.compliance.updateBusinessProfile, data, {forceMode: 'live'})
    }

    async function fetchBusinessContactDetail() {
        const response = await get(endpoints.compliance.getBusinessContactDetail, {}, {forceMode: 'live'})
        if (response?.data) contactDetail.value = { ...contactDetail.value, ...response.data };
    }

     async function fetchBusinessOwnerDetail() {
        const response = await get(endpoints.compliance.getBusinessOwnerDetail, {}, {forceMode: 'live'}) // or current mode
        if (response?.data) businessOwnerDetail.value = { ...businessOwnerDetail.value, ...response.data };
    }

    async function updateBusinessContactDetail(data) {
        await patch(endpoints.compliance.updateBusinessContactDetail, data, {forceMode: 'live'})
    }

    async function fetchComplianceStatus() {
        const response = await get(endpoints.compliance.getComplianceStatus, {}, {forceMode: 'live'})
        if (response?.data) complianceStatus.value = { ...complianceStatus.value, ...response.data };
    }

    async function fetchBanks() {
        const response = await get(endpoints.banks, {}, {forceMode: 'live'})
        if (response?.data) banks.value = response.data;
    }

    async function resolveAccountNumber(data) {
        return await post(endpoints.paymentGateway.verifyAccountNumber, data, {forceMode: 'live'})
    }

    async function addBankDetails(data) {
        return await post(endpoints.paymentGateway.addBankDetails, data, {forceMode: 'live'})
    }

    async function fetchBankAccounts() {
        const response = await get(endpoints.paymentGateway.addBankDetails, {}, {forceMode: 'live'})
        if (response?.data) bankAccounts.value = response.data;
    }

    async function updateOwnerProfile(data) {
        return await patch(endpoints.compliance.updateBusinessOwnerProfile, data, {forceMode: 'live'})
    }

    async function submitForReview() {
        return await post(endpoints.compliance.submitCompliance, {}, {forceMode: 'live'})
    }


    return {
        businessProfile,
        fetchBusinessProfile,
        updateBusinessProfile,
        contactDetail,
        fetchBusinessContactDetail,
        updateBusinessContactDetail,
        fetchComplianceStatus,
        complianceStatus,
        banks,
        bankAccounts,
        fetchBanks,
        resolveAccountNumber,
        addBankDetails,
        fetchBankAccounts,
        updateOwnerProfile,
        fetchBusinessOwnerDetail,
        businessOwnerDetail,
        isLocked,
        canGoLive,
        allSectionsFilled,
        submitForReview
    };
});
