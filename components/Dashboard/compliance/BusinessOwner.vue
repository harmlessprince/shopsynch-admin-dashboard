<template>
  <section class="flex flex-col gap-y-[1.2rem]">
    <!-- View Mode -->
    <div v-if="!isEditing && isCompleted" class="flex flex-col gap-y-[2.4rem] mt-[2.4rem] lg:mt-[5.5rem]">
      <div class="space-y-4">
        <div v-for="(field, index) in summaryFields" :key="index" class="flex flex-col gap-y-1">
          <span class="text-[1.4rem] text-gray-400 font-medium">{{ field.label }}</span>
          <span class="text-[1.6rem] text-gray-900 font-medium">{{ field.value || '---' }}</span>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div class="flex flex-col gap-y-1">
            <span class="text-[1.4rem] text-gray-400 font-medium">ID Document</span>
            <div v-if="ownerForm.idUploaded" class="flex items-center gap-x-2 text-green-600">
               <span class="material-symbols-outlined text-[1.8rem]">check_circle</span>
               <span class="text-[1.4rem] font-medium">Uploaded</span>
            </div>
            <div v-else class="text-gray-500 text-[1.4rem]">Not Uploaded</div>
          </div>
          
          <div class="flex flex-col gap-y-1">
            <span class="text-[1.4rem] text-gray-400 font-medium">Proof of Address</span>
            <div v-if="ownerForm.proofOfAddressUploaded" class="flex items-center gap-x-2 text-green-600">
               <span class="material-symbols-outlined text-[1.8rem]">check_circle</span>
               <span class="text-[1.4rem] font-medium">Uploaded</span>
            </div>
            <div v-else class="text-gray-500 text-[1.4rem]">Not Uploaded</div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mt-8 border-t pt-6 gap-x-4">
        <button
            v-if="!complianceStore.isLocked"
            type="button"
            class="px-8 py-3 border border-gray-300 rounded-[10px] text-[1.4rem] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            @click="isEditing = true"
        >
          Edit
        </button>
        <div v-else class="flex items-center gap-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
           <span class="material-symbols-outlined text-[1.8rem]">lock</span>
           <span class="text-[1.3rem] font-medium">Locked during review</span>
        </div>
        <button
            type="button"
            class="px-8 py-3 bg-primary text-white rounded-[10px] text-[1.4rem] font-medium hover:bg-primary-dark transition-colors"
            @click="handleNext"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Edit/Form Mode -->
    <Form
        v-else
        v-slot="{ errors, isSubmitting, meta }" class="mt-[2.4rem] lg:mt-[5.5rem] flex flex-col gap-y-[1.2rem]"
        :validation-schema="complianceOwnerFormSchema"
        :initial-values="ownerForm"
        :key="complianceStore.businessOwnerDetail?.id || 'new'"
        @submit="uploadOwnerDetailsWithFiles"
    >
      <div>
        <div class="flex justify-between">
          <FormLabel name="Full Name" label-for="fullName"/>
          <span
            v-tooltip="{ text: 'Owner\'s full legal name', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="ownerForm.fullName" type="text"
            placeholder="Enter owner's full name" name="fullName"
        />
        <span class="invalid-feedback">{{ errors.fullName }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Email" label-for="email"/>
          <span
            v-tooltip="{ text: 'Owner\'s email address', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="ownerForm.email" type="email"
            placeholder="Enter owner's email" name="email"
        />
        <span class="invalid-feedback">{{ errors.email }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Phone Number" label-for="phoneNumber"/>
          <span
            v-tooltip="{ text: 'Include country code (e.g., +234, +1)', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="ownerForm.phoneNumber" type="text"
            placeholder="+2348012345678" name="phoneNumber"
        />
        <span class="invalid-feedback">{{ errors.phoneNumber }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Address" label-for="address"/>
          <span
            v-tooltip="{ text: 'Owner\'s residential address', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="ownerForm.address" type="text"
            placeholder="Enter residential address" name="address"
        />
        <span class="invalid-feedback">{{ errors.address }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="ID Type" label-for="idType"/>
          <span
            v-tooltip="{ text: 'Type of identification document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <Field
            v-model="ownerForm.idType"
            name="idType"
            class="mt-[4px] rounded-[10px] border border-[#E0E0E0] w-full h-[47px] outline-none px-[1.6rem] bg-white focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            as="select"
            :disabled="complianceStore.isLocked"
        >
          <option value="">Select ID type</option>
          <option value="passport">Passport</option>
          <option value="drivers_license">Driver's License</option>
          <option value="national_id">National ID</option>
          <option value="voters_card">Voter's Card</option>
        </Field>
        <span class="invalid-feedback">{{ errors.idType }}</span>
      </div>

      <!-- ID Document Upload -->
      <div>
        <div class="flex justify-between">
          <FormLabel name="ID Document" label-for="idDocument"/>
          <span
            v-tooltip="{ text: 'Upload image of your identity document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <div class="border-2 border-dashed border-[#E0E0E0] rounded-[10px] p-4" :class="{'opacity-50 cursor-not-allowed': complianceStore.isLocked}">
          <label class="flex flex-col items-center gap-2" :class="complianceStore.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'">
            <span class="material-symbols-outlined text-[2.4rem] text-primary">cloud_upload</span>
            <span class="text-[1.4rem] text-gray-600">Click to upload or drag</span>
            <span class="text-[1.2rem] text-gray-500">PNG, JPG up to 10MB</span>
            <input
                type="file"
                accept=".jpg,.jpeg,.png"
                class="hidden"
                :disabled="complianceStore.isLocked"
                @change="(e) => handleFileSelect(e, 'idDocument')"
            />
          </label>
        </div>
        <div v-if="filePreviews.idDocument || ownerForm.idUploaded" class="mt-3 flex items-center gap-3">
          <img v-if="typeof filePreviews.idDocument === 'string' && filePreviews.idDocument.startsWith('data:')" :src="filePreviews.idDocument" alt="ID Document preview" class="h-[80px] w-[80px] object-cover rounded-lg border border-[#E0E0E0]" />
          <div v-else class="flex items-center justify-center h-[80px] w-[80px] bg-gray-100 rounded-lg">
             <span class="material-symbols-outlined text-gray-400">{{ ownerForm.idUploaded ? 'check_circle' : 'description' }}</span>
          </div>
          <div class="flex-1">
            <p class="text-[1.4rem] text-gray-700 font-medium">{{ fileUploads.idDocument?.name || (ownerForm.idUploaded ? 'Document Uploaded' : '') }}</p>
            <p v-if="fileUploads.idDocument" class="text-[1.2rem] text-gray-500">{{ (fileUploads.idDocument?.size / 1024 / 1024).toFixed(2) }}MB</p>
          </div>
          <button v-if="!complianceStore.isLocked" type="button" @click="clearFile('idDocument')" class="text-red-500 hover:text-red-700">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <!-- Proof of Address Upload -->
      <div>
        <div class="flex justify-between">
          <FormLabel name="Proof of Address" label-for="proofOfAddress"/>
          <span
            v-tooltip="{ text: 'Upload utility bill, lease, or similar document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <div class="border-2 border-dashed border-[#E0E0E0] rounded-[10px] p-4" :class="{'opacity-50 cursor-not-allowed': complianceStore.isLocked}">
          <label class="flex flex-col items-center gap-2" :class="complianceStore.isLocked ? 'cursor-not-allowed' : 'cursor-pointer'">
            <span class="material-symbols-outlined text-[2.4rem] text-primary">cloud_upload</span>
            <span class="text-[1.4rem] text-gray-600">Click to upload or drag</span>
            <span class="text-[1.2rem] text-gray-500">PNG, JPG, PDF up to 10MB</span>
            <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                class="hidden"
                :disabled="complianceStore.isLocked"
                @change="(e) => handleFileSelect(e, 'proofOfAddress')"
            />
          </label>
        </div>
        <div v-if="filePreviews.proofOfAddress || ownerForm.proofOfAddressUploaded" class="mt-3 flex items-center gap-3">
          <img v-if="typeof filePreviews.proofOfAddress === 'string' && filePreviews.proofOfAddress.startsWith('data:')" :src="filePreviews.proofOfAddress" alt="Proof of address preview" class="h-[80px] w-[80px] object-cover rounded-lg border border-[#E0E0E0]" />
          <div v-else class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[2.4rem] text-red-500">{{ ownerForm.proofOfAddressUploaded ? 'check_circle' : 'picture_as_pdf' }}</span>
          </div>
          <div class="flex-1">
            <p class="text-[1.4rem] text-gray-700 font-medium">{{ fileUploads.proofOfAddress?.name || (ownerForm.proofOfAddressUploaded ? 'Document Uploaded' : '') }}</p>
            <p v-if="fileUploads.proofOfAddress" class="text-[1.2rem] text-gray-500">{{ (fileUploads.proofOfAddress?.size / 1024 / 1024).toFixed(2) }}MB</p>
          </div>
          <button v-if="!complianceStore.isLocked" type="button" @click="clearFile('proofOfAddress')" class="text-red-500 hover:text-red-700">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div class="flex gap-x-4 mt-4">
        <button
            v-if="isCompleted"
            type="button"
            class="px-8 py-3 border border-gray-300 rounded-[10px] text-[1.4rem] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            @click="isEditing = false"
        >
          Cancel
        </button>
        <FormSubmitButton
            label="Save & Continue"
            submitting-label="Uploading..."
            :disabled="!meta.valid || !meta.dirty || complianceStore.isLocked"
            :is-submitting="isSubmitting"
            class="flex-1"
        />
      </div>

    </Form>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Form, Field } from "vee-validate";
import { complianceOwnerFormSchema } from "~/schemas/complianceSchema.js";
import { useComplianceStore } from "~/stores/compliance.store.js";
import { useToastStore } from '~/stores/toast.store.js';
import { handleFileUpload } from '~/utils/helpers.js';

const props = defineProps({
  nextSectionKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:currentSection', 'complete'])

const toastStore = useToastStore()
const complianceStore = useComplianceStore()

const isEditing = ref(false)
const isCompleted = computed(() => complianceStore.complianceStatus.kycCompleted)

const ownerForm = ref({
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  idType: '',
  idUploaded: false,
  proofOfAddressUploaded: false,
})

const summaryFields = computed(() => [
  { label: 'Full Name', value: ownerForm.value.fullName },
  { label: 'Email', value: ownerForm.value.email },
  { label: 'Phone Number', value: ownerForm.value.phoneNumber },
  { label: 'Address', value: ownerForm.value.address },
  { label: 'ID Type', value: ownerForm.value.idType },
])

const fileUploads = ref({
  idDocument: null,
  proofOfAddress: null,
})

const filePreviews = ref({
  idDocument: null,
  proofOfAddress: null,
})

function handleFileSelect(event, fileType) {
  const file = event.target.files?.[0]
  if (!file) return

  fileUploads.value[fileType] = file

  // Create preview for images
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      filePreviews.value[fileType] = e.target?.result
    }
    reader.readAsDataURL(file)
  } else {
    // For PDFs, show file name
    filePreviews.value[fileType] = file.name
  }
}

function clearFile(fileType) {
  fileUploads.value[fileType] = null
  filePreviews.value[fileType] = null
}

async function uploadOwnerDetailsWithFiles() {
  try {
    const payload = {
      fullName: ownerForm.value.fullName,
      email: ownerForm.value.email,
      phoneNumber: ownerForm.value.phoneNumber,
      address: ownerForm.value.address,
      idType: ownerForm.value.idType,
    }

    // Upload files if they exist and get their URLs
    if (fileUploads.value.idDocument) {
      const idDocumentUrl = await handleFileUpload(fileUploads.value.idDocument)
      if (idDocumentUrl) {
        payload.idDocumentUrl = idDocumentUrl
      }
    }

    if (fileUploads.value.proofOfAddress) {
      const proofOfAddressUrl = await handleFileUpload(fileUploads.value.proofOfAddress)
      if (proofOfAddressUrl) {
        payload.proofOfAddress = proofOfAddressUrl
      }
    }

    // Call store method to update owner profile with file URLs
    await complianceStore.updateOwnerProfile(payload)
    await complianceStore.fetchComplianceStatus()
    
    toastStore.success('Owner details updated successfully!')
    isEditing.value = false
    
    if (props.nextSectionKey) {
      emit('update:currentSection', props.nextSectionKey)
    } else {
      emit('complete')
    }
  } catch (error) {
    console.error('Error uploading owner details:', error)
    toastStore.error('Failed to upload owner details. Please try again.')
    throw error
  }
}

watch(() => complianceStore.isLocked, (locked) => {
  if (locked) isEditing.value = false;
}, { immediate: true })

function handleNext() {
  if (props.nextSectionKey) {
    emit('update:currentSection', props.nextSectionKey)
  } else {
    emit('complete')
  }
}

watch(() => complianceStore.businessOwnerDetail, (newOwner) => {
  if (newOwner && typeof newOwner === 'object') {
    // Explicitly update each field to maintain reactivity and handle different response structures
    ownerForm.value.fullName = newOwner.fullName || ownerForm.value.fullName;
    ownerForm.value.email = newOwner.email || ownerForm.value.email;
    ownerForm.value.phoneNumber = newOwner.phoneNumber || ownerForm.value.phoneNumber;
    ownerForm.value.address = newOwner.address || ownerForm.value.address;
    ownerForm.value.idType = newOwner.idType || ownerForm.value.idType;
    
    // Explicitly handle boolean flags with fallback to current value
    if (newOwner.idUploaded !== undefined) ownerForm.value.idUploaded = !!newOwner.idUploaded;
    if (newOwner.proofOfAddressUploaded !== undefined) ownerForm.value.proofOfAddressUploaded = !!newOwner.proofOfAddressUploaded;
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.invalid-feedback {
  color: #FF0000;
  font-size: 1.2rem;
  margin-top: 0.4rem;
  display: block;
}
</style>