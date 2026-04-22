<template>
  <section class="flex flex-col gap-y-[1.2rem]">
    <div v-if="!isEditing && isCompleted" class="flex flex-col gap-y-[2.4rem] mt-[2.4rem] lg:mt-[5.5rem]">
      <div class="space-y-4">
        <div v-for="(field, index) in summaryFields" :key="index" class="flex flex-col gap-y-1">
          <span class="text-[1.4rem] text-gray-400 font-medium">{{ field.label }}</span>
          <span class="text-[1.6rem] text-gray-900 font-medium">{{ field.value || '---' }}</span>
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

    <Form
        v-else
        v-slot="{ errors, isSubmitting, meta }" class="mt-[2.4rem] lg:mt-[5.5rem] flex flex-col gap-y-[1.2rem]"
        :validation-schema="complianceContactFormSchema"
        :initial-values="contactForm"
        :key="complianceStore.contactDetail?.id || 'new-contact'"
        @submit="updateBusinessContact"
    >
      <div>
        <div class="flex justify-between">
          <FormLabel name="Support Email Address" label-for="businessSupportEmailAddress"/>
          <span
            v-tooltip="{ text: contactTooltips.businessSupportEmailAddress, position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="contactForm.businessSupportEmailAddress" type="text"
            placeholder="Enter your support email address" name="businessSupportEmailAddress"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessSupportEmailAddress }}</span>
      </div>
      <div>
        <div class="flex justify-between">
          <FormLabel name="General Email Address" label-for="businessGeneralEmailAddress"/>
          <span
            v-tooltip="{ text: contactTooltips.businessGeneralEmailAddress, position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="contactForm.businessGeneralEmailAddress" type="text"
            placeholder="Enter your general email address" name="businessGeneralEmailAddress"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessGeneralEmailAddress }}</span>
      </div>
      <div>
        <div class="flex justify-between">
          <FormLabel name="Country" label-for="businessCountry"/>
          <span
            v-tooltip="{ text: contactTooltips.businessCountry, position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="contactForm.businessCountry" type="text"
            placeholder="Nigeria" name="businessCountry"
            readonly
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessCountry }}</span>
      </div>

      <div>
        <FormLabel name="Primary Phone Number"/>
        <FormInput
            v-model="contactForm.businessPrimaryPhoneNumber"
            type="text"
            placeholder="+234..." name="businessPrimaryPhoneNumber"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessPrimaryPhoneNumber }}</span>
      </div>

      <div>
        <FormLabel name="Secondary Phone Number"/>
        <FormInput
            v-model="contactForm.businessSecondaryPhoneNumber"
            type="text"
            placeholder="+234..." name="businessSecondaryPhoneNumber"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessSecondaryPhoneNumber }}</span>
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
            submitting-label="Saving..."
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
import { Form } from "vee-validate";
import { complianceContactFormSchema } from "~/schemas/complianceSchema.js";
import { useComplianceStore } from "~/stores/compliance.store.js";
import { useToastStore } from '~/stores/toast.store.js';

const props = defineProps({
  nextSectionKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:currentSection', 'complete'])

const complianceStore = useComplianceStore()
const toastStore = useToastStore()

const isEditing = ref(false)
const isCompleted = computed(() => complianceStore.complianceStatus.contactDetailFilled)

const contactForm = ref({
  businessCountry: 'Nigeria',
  businessPrimaryPhoneNumber: '',
  businessSecondaryPhoneNumber: '',
  businessSupportEmailAddress: '',
  businessGeneralEmailAddress: '',
})

const summaryFields = computed(() => [
  { label: 'Support Email', value: contactForm.value.businessSupportEmailAddress },
  { label: 'General Email', value: contactForm.value.businessGeneralEmailAddress },
  { label: 'Primary Phone', value: contactForm.value.businessPrimaryPhoneNumber },
  { label: 'Secondary Phone', value: contactForm.value.businessSecondaryPhoneNumber },
  { label: 'Country', value: contactForm.value.businessCountry },
])

const contactTooltips = {
  businessCountry: 'Select the country where your business is registered or primarily operates.',
  businessPrimaryPhoneNumber: 'Enter the main phone number customers or partners can reach your business on (include country code, e.g., +2348012345678).',
  businessSecondaryPhoneNumber: 'Optional: provide a secondary phone number for backup contact.',
  businessSupportEmailAddress: 'Provide the email address used for customer support inquiries.',
  businessGeneralEmailAddress: 'Provide the general business email address for official communication.',
}

async function updateBusinessContact(_e) {
  await complianceStore.updateBusinessContactDetail(contactForm.value)
  await complianceStore.fetchComplianceStatus()
  isEditing.value = false
  if (props.nextSectionKey) {
    emit('update:currentSection', props.nextSectionKey)
  } else {
    emit('complete')
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

watch(() => complianceStore.contactDetail, (newContact) => {
  if (newContact && typeof newContact === 'object') {
    contactForm.value.businessSupportEmailAddress = newContact.businessSupportEmailAddress || contactForm.value.businessSupportEmailAddress;
    contactForm.value.businessGeneralEmailAddress = newContact.businessGeneralEmailAddress || contactForm.value.businessGeneralEmailAddress;
    contactForm.value.businessPrimaryPhoneNumber = newContact.businessPrimaryPhoneNumber || contactForm.value.businessPrimaryPhoneNumber;
    contactForm.value.businessSecondaryPhoneNumber = newContact.businessSecondaryPhoneNumber || contactForm.value.businessSecondaryPhoneNumber;
    contactForm.value.businessCountry = newContact.businessCountry || contactForm.value.businessCountry || 'Nigeria';
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