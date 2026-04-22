<script setup>
import { useComplianceStore } from '~/stores/compliance.store.js'
import { useToastStore } from '~/stores/toast.store.js'

const switchMode = useSwitchModeStore()
const complianceStore = useComplianceStore()
const toastStore = useToastStore()
const switching = ref(false)

async function updateCurrentMode(mode) {
  if (mode === 'live' && !complianceStore.canGoLive) {
    const status = complianceStore.complianceStatus.complianceReviewStatus;
    let message = 'Your account must be approved before switching to Live Mode.';
    
    if (status === 'REJECTED') {
      message = 'Your compliance submission was rejected. Please address the issues and re-submit.';
    } else if (status === 'NOT_SUBMITTED') {
      message = 'Please complete and submit your compliance details for approval before switching to Live Mode.';
    }
    
    toastStore.error(message)
    navigateTo({name: "dashboard-compliance"})
    return
  }

  switching.value = true
  await switchMode.updateCurrentMode(mode)
  switching.value = false
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="flex w-[24.8rem] h-[5.1rem] p-[4px] rounded-[10px] bg-[#EDEFF2]">
      <button
          class="flex-1 py-2 rounded-[6px] text-[1.6rem] transition-colors"
          :class="{
        'bg-white text-[#003366] font-bold': switchMode?.currentMode === 'live',
        'text-[#7D8B99] font-normal':  switchMode?.currentMode !== 'live'
      }"
          :disabled="switching"
          @click="updateCurrentMode('live')"
      >
        Live mode
      </button>
      <button
          class="flex-1 py-2 rounded-[6px] text-[1.6rem] transition-colors"
          :class="{
        'bg-white text-[#E9500E] font-bold':  switchMode?.currentMode === 'test',
        'text-[#7D8B99] font-normal':  switchMode?.currentMode !== 'test'
      }"
          :disabled="switching"
          @click="updateCurrentMode('test')"
      >
        Test mode

      </button>
    </div>
    <div v-if="switching" class="mt-2 text-sm text-gray-500">

      Switching mode<span class="dot">.</span><span class="dot delay-200">.</span><span
        class="dot delay-400">.</span>

    </div>

  </div>

</template>

<style scoped>

</style>