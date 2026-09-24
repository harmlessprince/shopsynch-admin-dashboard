<script setup>
import { ref, computed, watch } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { logger } from '~/utils/helpers.js'
import ProductRichTextEditor from '~/components/Dashboard/ProductRichTextEditor.vue'
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
const activeSection = ref('technical')

const specifications = ref([])
const boxContents = ref('')
const manufacturerDescription = ref('')
const productWarranty = ref('')
const warrantyAddress = ref('')

const commonSpecSuggestions = [
  'Brand',
  'Model',
  'Color',
  'Material',
  'Dimensions',
  'Weight',
  'Battery Life',
  'Connectivity',
  'Warranty'
]

const validSpecsCount = computed(() => {
  return specifications.value.filter(s => s.key && s.key.trim() !== '' && s.value && s.value.trim() !== '').length
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.product) {
      activeSection.value = 'technical'
      specifications.value = (props.product.specifications || []).map(s => ({
        key: s.key || s.label || s.name || '',
        value: s.value || ''
      }))
      boxContents.value = props.product.boxContents || ''
      manufacturerDescription.value = props.product.manufacturerDescription || ''
      productWarranty.value = props.product.productWarranty || ''
      warrantyAddress.value = props.product.warrantyAddress || ''
    }
  },
  { immediate: true }
)

const addSpec = (key = '', value = '') => {
  specifications.value.push({ key, value })
}

const applySuggestion = (key) => {
  const emptySlot = specifications.value.find(s => !s.key || s.key.trim() === '')
  if (emptySlot) {
    emptySlot.key = key
  } else {
    specifications.value.push({ key, value: '' })
  }
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
    const cleanedSpecifications = specifications.value
      .filter(s => s.key && s.key.trim() !== '' && s.value && s.value.trim() !== '')
      .map(s => ({ key: s.key.trim(), value: s.value.trim() }))

    const payload = {
      specifications: cleanedSpecifications,
      boxContents: boxContents.value?.trim() || null,
      manufacturerDescription: manufacturerDescription.value?.trim() || null,
      productWarranty: productWarranty.value?.trim() || null,
      warrantyAddress: warrantyAddress.value?.trim() || null,
    }

    const response = await productStore.updateProduct(props.product.id, payload)

    if (response && response.status) {
      toastStore.showToast('Product specifications updated successfully', 'success')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to update specifications', error)
    toastStore.showToast('Failed to update specifications. Please try again.', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Drawer
    :open="open"
    width-class="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
    content-class="bg-white p-0 w-full"
    @update:open="$emit('update:open', $event)"
  >
    <div class="flex flex-col h-full bg-white">
      <!-- Drawer Header -->
      <div class="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200">
        <div>
          <h2 class="text-[2rem] sm:text-[2.2rem] font-semibold text-slate-900 tracking-tight">Manage Specifications</h2>
          <p class="text-[1.3rem] text-slate-500 font-normal mt-0.5">Add technical details, box contents, manufacturer notes, and warranty details.</p>
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

      <!-- Navigation Tabs -->
      <div class="flex border-b border-slate-200 px-6 sm:px-8 bg-slate-50/50 gap-4 overflow-x-auto">
        <button
          type="button"
          :class="[
            'py-3.5 text-[1.35rem] border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center',
            activeSection === 'technical'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          ]"
          @click="activeSection = 'technical'"
        >
          <span>Technical Specs</span>
          <span
            :class="[
              'ml-2 px-2 py-0.5 text-[1.1rem] rounded-full font-medium transition-colors',
              activeSection === 'technical' ? 'bg-primary/10 text-primary' : 'bg-slate-200/70 text-slate-600'
            ]"
          >
            {{ validSpecsCount }}
          </span>
        </button>
        <button
          type="button"
          :class="[
            'py-3.5 text-[1.35rem] border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeSection === 'box'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          ]"
          @click="activeSection = 'box'"
        >
          What's in the Box
        </button>
        <button
          type="button"
          :class="[
            'py-3.5 text-[1.35rem] border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeSection === 'manufacturer'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          ]"
          @click="activeSection = 'manufacturer'"
        >
          From Manufacturer
        </button>
        <button
          type="button"
          :class="[
            'py-3.5 text-[1.35rem] border-b-2 transition-all cursor-pointer whitespace-nowrap',
            activeSection === 'warranty'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          ]"
          @click="activeSection = 'warranty'"
        >
          Warranty & Support
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        <!-- Section 1: Technical Specifications -->
        <div v-if="activeSection === 'technical'" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[1.45rem] font-semibold text-slate-900">Custom Technical Key-Value Pairs</p>
              <p class="text-[1.25rem] text-slate-500 font-normal">e.g., Bluetooth: 5.1, Driver: 1.5 inch, Battery: 10 hours</p>
            </div>
            <button
              type="button"
              class="text-[1.25rem] font-medium text-primary flex items-center gap-1 hover:text-primary/80 cursor-pointer"
              @click="addSpec()"
            >
              <span class="material-symbols-outlined text-[1.8rem]">add</span>
              <span>Add Specification</span>
            </button>
          </div>

          <!-- Suggested specification tags -->
          <div class="flex items-center gap-2 flex-wrap pt-1 pb-2">
            <span class="text-[1.2rem] text-slate-400 font-normal">Common keys:</span>
            <button
              v-for="tag in commonSpecSuggestions"
              :key="tag"
              type="button"
              class="px-2.5 py-1 text-[1.15rem] font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              @click="applySuggestion(tag)"
            >
              + {{ tag }}
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(spec, index) in specifications"
              :key="index"
              class="flex flex-col sm:flex-row gap-3 items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 relative group"
            >
              <div class="w-full sm:w-1/2">
                <AppInput
                  v-model="spec.key"
                  :name="`spec-key-${index}`"
                  placeholder="e.g. Battery Life"
                  label="Specification Name"
                />
              </div>
              <div class="w-full sm:w-1/2">
                <AppInput
                  v-model="spec.value"
                  :name="`spec-val-${index}`"
                  placeholder="e.g. Up to 10 Hours"
                  label="Specification Value"
                />
              </div>
              <button
                type="button"
                class="mt-6 sm:mt-5 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Remove specification"
                @click="removeSpec(index)"
              >
                <span class="material-symbols-outlined text-[2rem]">delete</span>
              </button>
            </div>

            <div v-if="specifications.length === 0" class="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <span class="material-symbols-outlined text-slate-300 text-[4.5rem]">settings_suggest</span>
              <p class="text-[1.4rem] font-medium text-slate-700">No Technical Specifications Added</p>
              <p class="text-[1.25rem] text-slate-400 font-normal text-center max-w-sm">
                Add custom key-value attributes like battery life, weight, or technical capabilities.
              </p>
              <BaseButton variant="outline" class="h-[3.8rem] text-[1.25rem] font-medium mt-2" @click="addSpec()">
                + Add First Specification
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Section 2: What's in the Box -->
        <div v-else-if="activeSection === 'box'" class="space-y-4">
          <div>
            <p class="text-[1.45rem] font-semibold text-slate-900">What's in the Box</p>
            <p class="text-[1.25rem] text-slate-500 font-normal">List package contents, included cables, adapters, or documentation.</p>
          </div>
          <ProductRichTextEditor
            v-model="boxContents"
            label="Box Contents"
            placeholder="e.g. 1x JBL Clip 4 Speaker, 1x USB-C Charging Cable, 1x Quick Start Guide"
          />
        </div>

        <!-- Section 3: From Manufacturer -->
        <div v-else-if="activeSection === 'manufacturer'" class="space-y-4">
          <div>
            <p class="text-[1.45rem] font-semibold text-slate-900">From the Manufacturer</p>
            <p class="text-[1.25rem] text-slate-500 font-normal">Add manufacturer highlights, technology overview, or brand stories.</p>
          </div>
          <ProductRichTextEditor
            v-model="manufacturerDescription"
            label="Manufacturer Description"
            placeholder="Detailed overview and manufacturer product marketing copy..."
          />
        </div>

        <!-- Section 4: Warranty & Support -->
        <div v-else-if="activeSection === 'warranty'" class="space-y-6">
          <div class="space-y-4">
            <div>
              <p class="text-[1.45rem] font-semibold text-slate-900">Product Warranty</p>
              <p class="text-[1.25rem] text-slate-500 font-normal">Coverage details (e.g., 1 Year Official Manufacturer Warranty for parts and labor).</p>
            </div>
            <ProductRichTextEditor
              v-model="productWarranty"
              label="Warranty Terms"
              placeholder="e.g. 12 months manufacturer warranty against manufacturing defects..."
            />
          </div>

          <div class="space-y-4 pt-4 border-t border-slate-200/80">
            <div>
              <p class="text-[1.45rem] font-semibold text-slate-900">Warranty / Service Center Address</p>
              <p class="text-[1.25rem] text-slate-500 font-normal">Where customers can send items for repair or warranty claims.</p>
            </div>
            <ProductRichTextEditor
              v-model="warrantyAddress"
              label="Service Address / Contact"
              placeholder="e.g. Harman Service Center, 14 Victoria Island, Lagos. support@brand.com"
            />
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-6 sm:p-8 border-t border-slate-200 bg-slate-50/50 flex gap-3 justify-end">
        <BaseButton variant="outline" class="h-[4.2rem] px-5 text-[1.3rem] font-medium" @click="close">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="isSubmitting" class="h-[4.2rem] px-6 text-[1.3rem] font-medium" @click="save">
          Save Specifications
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
