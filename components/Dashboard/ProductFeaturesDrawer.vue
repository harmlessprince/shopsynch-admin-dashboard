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

const features = ref([])

onMounted(() => {
  if (props.product?.features) {
    features.value = [...props.product.features]
  }
})

const addFeature = () => {
  features.value.push('')
}

const removeFeature = (index) => {
  features.value.splice(index, 1)
}

const close = () => {
  emit('update:open', false)
}

const save = async () => {
  try {
    isSubmitting.value = true
    // Filter out empty features
    const cleanedFeatures = features.value.filter(f => f.trim() !== '')
    
    const response = await productStore.updateProduct(props.product.id, {
      features: cleanedFeatures
    })

    if (response && response.status) {
      toastStore.success('Features updated successfully')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to update features', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full max-w-lg">
    <div class="flex flex-col h-full bg-white">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 class="text-2xl font-bold text-black">Manage Features</h2>
        <button @click="close" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-10 space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold text-black">Product Features</p>
            <button @click="addFeature" class="text-xs font-black text-primary flex items-center gap-1 hover:underline uppercase tracking-widest">
              <span class="material-symbols-outlined text-sm">add</span> Add Feature
            </button>
          </div>
          
          <div class="space-y-3">
            <div v-for="(feature, index) in features" :key="index" class="flex gap-2 items-center group">
              <div class="flex-1">
                <AppInput 
                  v-model="features[index]" 
                  :name="`feature-${index}`" 
                  placeholder="e.g. 24-hour battery life" 
                />
              </div>
              <button @click="removeFeature(index)" class="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
            
            <div v-if="features.length === 0" class="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
              <span class="material-symbols-outlined text-slate-200 text-4xl mb-2">featured_play_list</span>
              <p class="text-xs text-slate-400 font-bold uppercase tracking-widest text-center px-6">
                No features added yet. Highlight what makes this product special.
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
