<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useCategoryStore } from '~/stores/category.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { useErrorStore } from '~/stores/error.store.js'
import { logger } from '~/utils/helpers.js'

const props = defineProps({
  open: {
    type: Boolean,
    required: true
  },
  category: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:open', 'success'])

const categoryStore = useCategoryStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()

const isSubmitting = ref(false)

const form = reactive({
  name: '',
  categoryId: '',
  parentId: ''
})

const isEditing = computed(() => !!props.category?.id)

const isSystemBacked = computed(() => !!(props.category?.systemCategoryId || props.category?.category?.id))

const drawerTitle = computed(() => isEditing.value ? 'Edit Category' : 'Add Category')

const submitLabel = computed(() => isEditing.value ? 'Update Category' : 'Create Category')

const systemCategories = computed(() => 
  categoryStore.defaultCategories.map(c => ({ label: c.name, value: c.id }))
)

const parentCategories = computed(() => 
  categoryStore.categories.map(c => ({ label: c.name, value: c.id }))
)

onMounted(async () => {
  await Promise.all([
    categoryStore.getCategories(),
    categoryStore.getDefaultCategories()
  ])
})

watch(
  () => props.open,
  (open) => {
    if (!open) return

    form.name = props.category?.name || ''
    form.categoryId = props.category?.systemCategoryId || props.category?.category?.id || ''
    form.parentId = props.category?.parentId || props.category?.parent?.id || ''
  }
)

const submit = async () => {
  if (!form.name && !form.categoryId) {
    toastStore.error('Please provide a category name or select a system category')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: form.name || undefined,
      categoryId: form.categoryId || undefined,
      parentId: form.parentId || undefined
    }
    
    const response = isEditing.value
      ? await categoryStore.updateCategory(props.category.id, { name: form.name })
      : await categoryStore.createCategory(payload)
    
    if (response && response.status) {
      toastStore.success(isEditing.value ? 'Category updated successfully' : 'Category created successfully')
      emit('success')
      close()
      resetForm()
    }
  } catch (error) {
    logger.error('Failed to save category', error)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.categoryId = ''
  form.parentId = ''
}

const close = () => {
  emit('update:open', false)
}
</script>

<template>
  <Drawer :open="open" @update:open="$emit('update:open', $event)" content-class="bg-white p-0 w-full">
    <div class="flex flex-col h-full bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 class="text-2xl font-bold text-slate-900">{{ drawerTitle }}</h2>
        <button @click="close" class="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-10 space-y-8">
        <p class="text-slate-600 text-sm">
          {{ isEditing ? 'Update how this category appears in your store.' : 'Create a custom category for your shop or link to a standard system category.' }}
        </p>

        <p v-if="isEditing && isSystemBacked" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          System-backed categories cannot be renamed by the API. Create a custom category if you need a different store label.
        </p>

        <div class="space-y-6">
          <!-- Custom Name -->
          <div class="space-y-1">
            <AppInput
              v-model="form.name"
              name="name"
              placeholder="Enter custom category name"
              label="Category Name (Custom)"
              :readonly="isEditing && isSystemBacked"
              :error="errorStore.validationErrors?.name"
            />
          </div>

          <div class="flex items-center gap-4">
            <div class="h-px bg-slate-100 flex-1"></div>
            <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">OR</span>
            <div class="h-px bg-slate-100 flex-1"></div>
          </div>

          <!-- System Category -->
          <SearchableSelectInput 
            v-model="form.categoryId" 
            label="Link to System Category" 
            :options="systemCategories" 
            :disabled="!!form.name || isEditing"
            placeholder="Select a pre-defined category" 
            :error="errorStore.validationErrors?.categoryId"
          />

          <div class="h-px bg-slate-100 w-full"></div>

          <!-- Parent Category -->
          <SearchableSelectInput 
            v-model="form.parentId" 
            label="Parent Category (Optional)" 
            :options="parentCategories" 
            placeholder="Select parent for sub-category" 
            hint="You must already have categories created to define a parent for sub-categories"
            :disabled="isEditing"
            :error="errorStore.validationErrors?.parentId"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-100 bg-slate-50/50 flex gap-4 justify-end">
        <BaseButton 
          variant="outline" 
          @click="close"
          class="min-w-[120px]"
        >
          Cancel
        </BaseButton>
        
        <BaseButton 
          @click="submit"
          :loading="isSubmitting"
          :disabled="isEditing && isSystemBacked"
          class="min-w-[160px]"
        >
          {{ submitLabel }}
        </BaseButton>
      </div>
    </div>
  </Drawer>
</template>
