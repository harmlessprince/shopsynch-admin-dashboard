<script setup>
import { ref, watch } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { logger } from '~/utils/helpers.js'
import AppInput from '~/components/AppInput.vue'
import BaseButton from '~/components/BaseButton.vue'
import Drawer from '~/components/Drawer.vue'

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

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.product) {
      features.value = props.product.features ? [...props.product.features] : []
    }
  },
  { immediate: true }
)

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
    const cleanedFeatures = features.value.filter(f => f && f.trim() !== '').map(f => f.trim())

    const response = await productStore.updateProduct(props.product.id, {
      features: cleanedFeatures
    })

    if (response && response.status) {
      toastStore.showToast('Product features updated successfully', 'success')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to update features', error)
    toastStore.showToast('Failed to update features. Please try again.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Drawer :open="open" content-class="bg-white p-0 w-full" @update:open="$emit('update:open', $event)">
    <div class="flex flex-col h-full bg-white">
      <!-- Drawer Header -->
      <div class="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200">
        <div>
          <h2 class="text-[2rem] sm:text-[2.2rem] font-bold text-slate-900 tracking-tight">Manage Key Features</h2>
          <p class="text-[1.3rem] text-slate-500 mt-0.5">Bulleted bullet points highlight key product capabilities.</p>
        </div>
        <button
          type="button"
          class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
          aria-label="Close drawer"
          @click="close"
        >
          <span class="material-symbols-outlined text-[2.2rem]" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-[1.5rem] font-bold text-slate-900">Feature Bullet Points</p>
            <button
              type="button"
              class="text-[1.25rem] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              @click="addFeature"
            >
              <span class="material-symbols-outlined text-[1.8rem]" aria-hidden="true">add</span>
              <span>Add Feature</span>
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(feature, index) in features"
              :key="index"
              class="flex gap-2.5 items-center group bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80"
            >
              <div class="flex-1">
                <AppInput
                  v-model="features[index]"
                  :name="`feature-${index}`"
                  placeholder="e.g. IP67 Waterproof & Dustproof Design"
                />
              </div>
              <button
                type="button"
                class="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Remove feature"
                @click="removeFeature(index)"
              >
                <span class="material-symbols-outlined text-[2rem]">delete</span>
              </button>
            </div>

            <div v-if="features.length === 0" class="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <span class="material-symbols-outlined text-slate-300 text-[4.5rem]">featured_play_list</span>
              <p class="text-[1.4rem] font-bold text-slate-700">No Key Features Added</p>
              <p class="text-[1.25rem] text-slate-400 text-center max-w-sm">
                Add bullet points explaining what makes this product stand out.
              </p>
              <BaseButton variant="outline" class="h-[3.8rem] text-[1.25rem] mt-2" @click="addFeature">
                + Add First Feature
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-6 sm:p-8 border-t border-slate-200 bg-slate-50/50 flex gap-3 justify-end">
        <BaseButton variant="outline" class="h-[4.2rem] px-5 text-[1.3rem]" @click="close">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="isSubmitting" class="h-[4.2rem] px-6 text-[1.3rem] font-bold" @click="save">
          Save Features
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
