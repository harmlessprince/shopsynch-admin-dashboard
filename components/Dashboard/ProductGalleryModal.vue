<script setup>
import { ref, onMounted } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { useToastStore } from '~/stores/toast.store.js'
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'
import { logger } from '~/utils/helpers.js'
import {VueFinalModal} from "vue-final-modal";

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
const { post } = useApiService()

const imageList = ref([])
const uploadingStates = ref([])
const isSaving = ref(false)

onMounted(() => {
  if (props.product?.imageList) {
    imageList.value = [...props.product.imageList]
    uploadingStates.value = new Array(imageList.value.length).fill(false)
  }
})

const addImageSlot = () => {
  imageList.value.push(null)
  uploadingStates.value.push(false)
}

const handleFileUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    uploadingStates.value[index] = true
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await post(endpoints.files.uploadSingle, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    if (response && response.data) {
      imageList.value[index] = response.data.url
    }
  } catch (error) {
    logger.error('Failed to upload image', error)
    toastStore.error('Image upload failed')
  } finally {
    uploadingStates.value[index] = false
  }
}

const removeImage = (index) => {
  imageList.value.splice(index, 1)
  uploadingStates.value.splice(index, 1)
}

const close = () => {
  emit('update:open', false)
}

const save = async () => {
  try {
    isSaving.value = true
    const validImages = imageList.value.filter(img => img !== null)
    
    const response = await productStore.updateProduct(props.product.id, {
      imageList: validImages,
      // Also update main image if it was the first one
      image: validImages[0] || props.product.image,
      thumbnail: validImages[0] || props.product.thumbnail
    })

    if (response && response.status) {
      toastStore.success('Gallery updated successfully')
      emit('success')
      close()
    }
  } catch (error) {
    logger.error('Failed to update gallery', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <VueFinalModal
    v-model="props.open"
    class="flex items-center justify-center"
    content-class="bg-white rounded-[2rem] p-0 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
    overlay-class="bg-black/60 backdrop-blur-sm"
    @update:model-value="(val) => emit('update:open', val)"
  >
    <div class="flex items-center justify-between p-8 border-b border-gray-50 bg-slate-50/50">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-black tracking-tight">Product Gallery</h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">{{ props.product.name }}</p>
      </div>
      <button @click="close" class="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-rose-500 shadow-sm">
        <span class="material-symbols-outlined text-2xl">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-10">
      <div class="grid grid-cols-3 gap-6">
        <div 
          v-for="(img, index) in imageList" 
          :key="index"
          class="aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-300"
          :class="img ? 'border-primary shadow-lg shadow-primary/5' : 'border-slate-200 hover:border-primary/50 bg-slate-50/30'"
        >
          <!-- Uploading state -->
          <div v-if="uploadingStates[index]" class="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center gap-3">
             <Spinner width="48px" height="48px" />
             <p class="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Uploading...</p>
          </div>

          <template v-if="img">
            <img :src="img" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]">
              <label class="px-6 py-2 bg-white text-black hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-xl transition-all">
                Change
                <input type="file" class="hidden" accept="image/*" @change="handleFileUpload($event, index)">
              </label>
              <button @click="removeImage(index)" class="px-6 py-2 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Remove
              </button>
            </div>
            <div v-if="index === 0" class="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
              Main Cover
            </div>
          </template>
          
          <template v-else>
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-primary group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-4xl">cloud_upload</span>
            </div>
            <p class="text-xs font-black text-black tracking-tight mb-1">Add Image</p>
            <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest">PNG, JPG up to 5MB</p>
            <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" @change="handleFileUpload($event, index)">
          </template>
        </div>

        <button 
          @click="addImageSlot" 
          class="aspect-square rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-primary text-3xl">add</span>
          </div>
          <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary">Add Another Slot</p>
        </button>
      </div>

      <div v-if="imageList.length === 0" class="py-20 flex flex-col items-center justify-center text-center">
         <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-slate-200 text-6xl">imagesmode</span>
         </div>
         <h4 class="text-xl font-black text-black mb-2">No Images in Gallery</h4>
         <p class="text-slate-400 text-sm max-w-xs mx-auto mb-8 font-bold">Showcase your product from different angles with high-quality images.</p>
         <BaseButton @click="addImageSlot" variant="outline">
            Start Adding Photos
         </BaseButton>
      </div>
    </div>

    <div class="p-8 border-t border-gray-50 bg-slate-50/50 flex gap-4 justify-end">
      <BaseButton variant="outline" @click="close" class="min-w-[140px]">Discard Changes</BaseButton>
      <BaseButton :loading="isSaving" @click="save" class="min-w-[140px]">Save Gallery</BaseButton>
    </div>
  </VueFinalModal>
</template>
