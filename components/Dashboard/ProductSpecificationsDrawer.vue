<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { logger } from '~/utils/helpers.js'

const props = defineProps({
  open: {
    type: Boolean,
    required: true
  },
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:open', 'success'])

const productStore = useProductStore()
const toastStore = useToastStore()
const isSubmitting = ref(false)

const specifications = ref([])

onMounted(() => {
  if (props.product?.specifications) {
    specifications.value = props.product.specifications.map(s => ({ ...s }))
  }
})

const addSpec = () => {
  specifications.value.push({ key: '', value: '' })
}

const removeSpec = (index) => {
  specifications.value.splice(index, 1)
}

const close = () => {
  emit('update:open', false)
}

const save = async () => {
  try {
    isSubmitting.value = true
    // Filter out incomplete specs
    const cleanedSpecifications = specifications.value.filter(s => s.key.trim() !== '' && s.value.trim() !== '')
    
    const response = await productStore.updateProduct(props.product.id, {
      specifications: cleanedSpecifications
    })

    if (response && response.status) {
      toastStore.success('Specifications updated successfully')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to update specifications', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full max-w-lg">
    <div class="flex flex-col h-full bg-white">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 class="text-2xl font-bold text-black">Manage Specifications</h2>
        <button @click="close" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-10 space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold text-black">Technical Specifications</p>
            <button @click="addSpec" class="text-xs font-black text-primary flex items-center gap-1 hover:underline uppercase tracking-widest">
              <span class="material-symbols-outlined text-sm">add</span> Add Specification
            </button>
          </div>
          
          <div class="space-y-3">
            <div 
              v-for="(spec, index) in specifications" 
              :key="index" 
              class="flex gap-3 items-start bg-slate-50 p-6 rounded-2xl relative group border border-slate-100"
            >
               <div class="flex-1 space-y-4">
                 <AppInput 
                   v-model="spec.key" 
                   :name="`spec-key-${index}`" 
                   placeholder="Label (e.g. Display)" 
                   label="Key" 
                 />
                 <AppInput 
                   v-model="spec.value" 
                   :name="`spec-val-${index}`" 
                   placeholder="Value (e.g. 15.6 inches)" 
                   label="Value" 
                 />
               </div>
               <button @click="removeSpec(index)" class="absolute -right-2 -top-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                 <span class="material-symbols-outlined text-sm">close</span>
               </button>
            </div>
            
            <div v-if="specifications.length === 0" class="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <span class="material-symbols-outlined text-slate-200 text-4xl mb-2">settings_suggest</span>
              <p class="text-xs text-slate-400 font-bold uppercase tracking-widest text-center px-6">
                No specifications added yet. Add detailed technical information for your customers.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-gray-100 bg-slate-50/50 flex gap-4 justify-end">
        <BaseButton variant="outline" @click="close" class="min-w-[120px]">Cancel</BaseButton>
        <BaseButton :loading="isSubmitting" @click="save" class="min-w-[120px]">Save Changes</BaseButton>
      </div>
    </div>
  </Drawer>
</template>
