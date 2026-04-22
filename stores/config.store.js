import {defineStore} from "pinia";
import {ref} from "vue";
import {endpoints} from "~/utils/endpoints.js";
import {useApiService} from "~/services/apiService.js";


export const useConfigStore = defineStore("configStore", () => {
    const {patch, get} = useApiService();
    const testDomains = ref([]);
    const liveDomains = ref([]);
    const testApiKey = ref('');
    const liveApiKey = ref('');

    async function updateDomains(data) {
        const response = await patch(endpoints.config.updateDomain, {...data}, {forceMode: 'live'});
        if (response) {
            if (data.mode === 'test') {
                testDomains.value = data.domains;
            }
            if (data.mode === 'live') {
                liveDomains.value = data.domains;
            }
        }
    }


    async function getDomains() {
        const response = await get(endpoints.config.allDomains, {}, {forceMode: 'live'});
        const data = response.data;
        testDomains.value = data.test;
        liveDomains.value = data.live;
    }

    async function getKeys() {
        const response = await get(endpoints.config.allKeys, {}, {forceMode: 'live'});
        const data = response.data;
        testApiKey.value = data.test;
        liveApiKey.value = data.live;
    }

    return {
        getKeys,
        getDomains,
        updateDomains,
        liveDomains,
        testDomains,
        testApiKey,
        liveApiKey,
    }
});