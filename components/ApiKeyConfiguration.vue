<script setup lang="ts">
import {defineEmits} from "vue";

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
  },
  domains: {
    type: Array,
    default: () => []
  }
});
const typeLabel = computed(() => props.type === 'live' ? 'Live' : 'Test');

const emit = defineEmits(['toggleModal', 'toggleLearnMoreModal'])
</script>

<template>
  <section class="mt-[2.4rem] lg:mt-[4rem]">
    <h1 class="font-[700] mb-[1.2rem] text-[1.6rem] lg:text-[1.8rem]">API Configuration - {{ typeLabel }} Mode</h1>
    <div
        v-if="type === 'test'"
        class="mb-[1.6rem] p-[1.6rem] lg:p-[24px] rounded-[10px] border border-[#DA6B49] bg-[#FEF1ED] flex items-start lg:items-center gap-x-[12px] ">
      <span class="material-symbols-outlined text-[20px] lg:text-[24px] text-[#D46B49] shrink-0">warning</span>
      <span class="font-[500] text-[1.4rem] lg:text-[1.6rem]">These keys are for testing only. Please DO NOT use them in production.</span>

    </div>
    <div class="rounded-[10px] bg-[#fbfbfb] p-[1.6rem] lg:p-[2.4rem] flex flex-col gap-y-[2.4rem] lg:gap-y-[4rem]">

      <!-- Public Key Section -->
      <div>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-[1.2rem] gap-y-[0.8rem] sm:gap-y-0">
          <label class="text-[#000] font-[500]">{{ typeLabel }} Public Key</label>
          <span class="font-[600] text-[#003366] cursor-pointer text-[1.4rem]" @click="$emit('generateKey')">
            Generate new key
          </span>
        </div>
        <ApiKey :value="apiKey" :title="`${typeLabel} public key`"/>
      </div>

      <!-- Domain Whitelist Section -->
      <div>
        <div class="flex justify-between items-center mb-[1.2rem]">
          <label class="font-[500]">Domain Whitelist</label>
          <span
              class="cursor-pointer text-[#000000CC] flex items-center gap-x-[0.8rem] font-medium text-[1.4rem]"
              @click="$emit('toggleLearnMoreModal', 'learnModal')"
          >
            <img src="/icons/info-circle2.svg" alt="info" class="w-[18px] h-[18px]">
            <span>Learn more</span>
          </span>
        </div>

        <div v-if="domains?.length > 0" class="w-full">
          <div
              class="relative w-full min-h-[58px] bg-[#fff] flex flex-col sm:flex-row items-start sm:items-center justify-between p-[1.2rem] sm:pl-[24px] sm:pr-[8px] rounded-[10px] border border-[#E0E0E0] gap-y-[1.2rem] sm:gap-y-0">
            <div class="w-full text-[1.4rem] lg:text-[1.6rem] text-[#00000099] flex flex-wrap gap-[0.8rem]">
              <span
                  v-for="(domain, index) in domains"
                  :key="index"
                  class="bg-[#EDEFF2] rounded-[20px] px-[1.2rem] py-[0.4rem]">
                {{ domain }}
              </span>
            </div>
            <button
                class="shrink-0 cursor-pointer bg-[#fff] text-[#003366] h-[42px] w-full sm:w-[16.1rem] rounded-[10px] border border-[#00336633] outline-none flex justify-center items-center gap-x-[1rem]"
                @click="$emit('toggleModal', 'editDomainWhitelistModal')"
            >
              <span>Edit domains</span>
              <img src="/icons/edit.svg" class="w-[20px] h-[20px]" alt="edit icon">
            </button>
          </div>
        </div>

        <div v-else>
          <div
              class="w-full h-[58px] bg-[#fff] rounded-[10px] border border-[#E0E0E0] flex items-center justify-center">
            <div
                class="flex items-center gap-x-[1.2rem] text-[#003366] cursor-pointer"
                @click="$emit('toggleModal')"
            >
              <span class="material-symbols-outlined">add</span>
              <span class="font-[600]">Add domain(s)</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>

</style>