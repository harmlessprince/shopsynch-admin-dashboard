import {defineStore} from "pinia";
import {endpoints} from "~/utils/endpoints.js";
import {useApiService} from "~/services/apiService.js";


export const useSwitchModeStore = defineStore("switchModeStore", () => {
    const currentMode = useCookie("displayMode")
    const complianceStore = useComplianceStore()
    const toastStore = useToastStore()
    const {patch} = useApiService();

    function switchMode(newMode) {
        if (newMode === null) {
            currentMode.value = "test"
        } else {
            currentMode.value = newMode;
        }
        // await updateCurrentMode(currentMode.value);
    }

    function initModeFromCookie() {
        // const cookieMode = useCookie('displayMode')

        if (currentMode.value === 'test' || currentMode.value === 'live') {
            currentMode.value = useCookie("displayMode").value
        } else {
            currentMode.value = 'test' // fallback
        }
    }

    async function updateCurrentMode(mode) {
        console.log("Attempting to switch mode to:", mode)
        if (mode === "live") {
            await complianceStore.fetchComplianceStatus()
            console.log("complianceStore.complianceStatus", complianceStore.complianceStatus.kybCompleted)
            if (complianceStore.complianceStatus.kybCompleted === null || complianceStore.complianceStatus.kybCompleted === false) {
                navigateTo({name: "dashboard-compliance"})
                toastStore.error("You must complete your profile to switch to live mode")
                return
            }
        }

        const url = endpoints.config.updateCurrentMode.replace(':mode', mode);
        await patch(url, {}, {forceMode: 'live'});
        useCookie('displayMode').value = mode;
        switchMode(mode)
        location.reload();
    }

    return {
        currentMode, switchMode, updateCurrentMode, initModeFromCookie
    }
});