<script setup>
import { VueFinalModal } from 'vue-final-modal'

const props = defineProps({
  attributes: {
    type: Object,
    default: () => ({})
  },
  variantName: {
    type: String,
    default: 'Variant'
  }
})

const emit = defineEmits(['close'])
</script>

<template>
  <VueFinalModal
    class="flex justify-center items-center"
    content-class="relative flex flex-col max-w-[500px] w-full mx-4 bg-white rounded-2xl shadow-2xl p-0 overflow-hidden"
    overlay-transition="vfm-fade"
    content-transition="vfm-slide-up"
  >
    <div class="flex items-center justify-between p-6 border-b border-gray-100">
      <h3 class="text-xl font-black text-black">{{ variantName }} Attributes</h3>
      <button @click="$emit('close')" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <div class="p-6 max-h-[60vh] overflow-y-auto">
      <div v-if="attributes && Object.keys(attributes).length > 0" class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        <div v-for="(value, key) in attributes" :key="key" class="flex justify-between items-center p-4 bg-white hover:bg-slate-50/50 transition-colors">
          <span class="text-xs text-slate-400 font-bold uppercase tracking-widest">{{ key }}</span>
          <span class="text-sm font-black text-black">{{ value }}</span>
        </div>
      </div>
      <div v-else class="text-center py-10">
        <span class="material-symbols-outlined text-slate-200 text-5xl mb-2">info</span>
        <p class="text-slate-400 text-sm italic">No extra attributes found for this variant.</p>
      </div>
    </div>

    <div class="p-6 bg-slate-50 flex justify-end">
       <BaseButton variant="primary" @click="$emit('close')" class="w-full">
         Close
       </BaseButton>
    </div>
  </VueFinalModal>
</template>
