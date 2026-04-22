<template>
  <section class="flex flex-col">
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
        :validation-schema="complianceProfileFormSchema"
        :initial-values="profileForm"
        :key="complianceStore.businessProfile?.id || 'new-profile'"
        @submit="updateBusinessProfile"
    >
      <div>
        <div class="flex justify-between">
          <FormLabel name="Trading Name" label-for="businessTradingName"/>
          <span
            v-tooltip="{ text: 'Name customers know you by', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessTradingName" type="text"
            placeholder="Enter your trading name" name="businessTradingName"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessTradingName }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Description"/>
          <span
              v-tooltip="{ text: 'Please provide clear description of the product or services you plan to sell using ShopSynch API. Be specific about your type of product', position: 'center' }"
              class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>

        <Field
            v-model="profileForm.businessDescription"
            name="businessDescription"
            type="text"
            class="border border-[#E0E0E0] w-full h-[120px] lg:h-[179px] rounded-[10px] text-left p-4 outline-none focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            as="textarea"
            :disabled="complianceStore.isLocked"
          />
        <span class="invalid-feedback">{{ errors.businessDescription }}</span>
      </div>

      <div>
        <FormLabel name="Staff Size"/>
        <Field
            v-model="profileForm.staffSize"
            class="w-full h-[47px] rounded-[10px] border border-[#E0E0E0] outline-none px-[1.6rem] font-[400] text-[14px] text-[#616161] placeholder-[#616161] focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            type="number"
            placeholder="0" name="staffSize" min="0"
            :disabled="complianceStore.isLocked"
          />
        <span class="invalid-feedback">{{ errors.staffSize }}</span>
      </div>

      <div>
        <FormLabel name="Monthly projected sales value(naira)"/>
        <FormInput
            v-model="profileForm.businessExpectedMonthlyIncome"
            type="text"
            placeholder="5,000,000" name="businessExpectedMonthlyIncome"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessExpectedMonthlyIncome }}</span>
      </div>
      <div>
        <FormLabel name="Industry"/>
        <Field
            v-model="profileForm.industry"
            name="industry"
            class="mt-[4px] rounded-[10px] border border-[#E0E0E0] w-full h-[47px] outline-none px-[1.6rem] bg-white focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            as="select"
            :disabled="complianceStore.isLocked"
        >
          <option v-for="industry in industries" :key="industry.code" :value="industry.code">{{
              industry.label
            }}
          </option>
        </Field>
        <span class="invalid-feedback">{{ errors.industry }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Business Storefront URL"/>
          <span
            v-tooltip="{ text: 'Your online store or business website URL', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <div class="relative">
          <FormInput
              v-model="profileForm.businessStorefrontUrl" type="url"
              placeholder="https://yourbusiness.com" name="businessStorefrontUrl"
              :disabled="complianceStore.isLocked"
          />
          <div v-if="isCheckingSlug" class="absolute right-4 top-1/2 -translate-y-1/2">
            <span class="material-symbols-outlined animate-spin text-primary">sync</span>
          </div>
        </div>
        <span v-if="slugValidationError" class="invalid-feedback">{{ slugValidationError }}</span>
        <span v-else class="invalid-feedback">{{ errors.businessStorefrontUrl }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="Business Address"/>
          <span
            v-tooltip="{ text: 'Full business address', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessAddress" type="text"
            placeholder="Enter business address" name="businessAddress"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessAddress }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="State"/>
          <span
            v-tooltip="{ text: 'State or province where business operates', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessState" type="text"
            placeholder="Enter state" name="businessState"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessState }}</span>
      </div>

      <div>
        <div class="flex justify-between">
          <FormLabel name="City"/>
          <span
            v-tooltip="{ text: 'City where business is located', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessCity" type="text"
            placeholder="Enter city" name="businessCity"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessCity }}</span>
      </div>
      <div>
        <FormLabel name="Business Type"/>
        <Field
            v-model="profileForm.businessType"
            name="businessType"
            class="mt-[4px] rounded-[10px] border border-[#E0E0E0] w-full h-[47px] outline-none px-[1.6rem] bg-white focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            as="select"
            :disabled="complianceStore.isLocked"
        >
          <option v-for="item in businessTypes" :key="item.code" :value="item.code">{{
              item.label
            }}
          </option>
        </Field>
        <span class="invalid-feedback">{{ errors.businessType }}</span>
      </div>

      <div v-if="profileForm.businessType === 'registered'">
        <div class="flex justify-between">
          <FormLabel name="Legal Business name"/>
          <span
            v-tooltip="{ text: 'Name on registration document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.legalBusinessName" type="text"
            placeholder="Enter legal business name" name="legalBusinessName"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.legalBusinessName }}</span>
      </div>
      <div v-if="profileForm.businessType === 'registered'">
        <div class="flex justify-between">
          <FormLabel name="Registration Number"/>
          <span
            v-tooltip="{ text: 'Number on registration document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessRegistrationNumber" type="text"
            placeholder="Enter registration number" name="businessRegistrationNumber"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessRegistrationNumber }}</span>
      </div>

      <div v-if="profileForm.businessType === 'registered'">
        <div class="flex justify-between">
          <FormLabel name="Tax ID Number"/>
          <span
            v-tooltip="{ text: 'Tax identification number for your business', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.businessTaxIdNumber" type="text"
            placeholder="Enter tax ID number" name="businessTaxIdNumber"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.businessTaxIdNumber }}</span>
      </div>

      <div v-if="profileForm.businessType === 'registered'">
        <div class="flex justify-between">
          <FormLabel name="CAC Document URL"/>
          <span
            v-tooltip="{ text: 'URL of your Corporate Affairs Commission document', position: 'center' }"
            class="material-symbols-outlined text-[1.8rem] text-gray-400 cursor-help"
          >
            help
          </span>
        </div>
        <FormInput
            v-model="profileForm.cacDocumentUrl" type="url"
            placeholder="https://..." name="cacDocumentUrl"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.cacDocumentUrl }}</span>
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
            :disabled="!meta.valid || !meta.dirty || slugValidationError || isCheckingSlug || complianceStore.isLocked"
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
import { complianceProfileFormSchema } from "~/schemas/complianceSchema.js";
import { useComplianceStore } from "~/stores/compliance.store.js";
import { useStoreStore } from "~/stores/store.store.js";
import { useToastStore } from '~/stores/toast.store.js';
import { debounce } from '~/utils/helpers.js';

const props = defineProps({
  nextSectionKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:currentSection'])

const toastStore = useToastStore()
const complianceStore = useComplianceStore()
const storeStore = useStoreStore()

const isEditing = ref(false)
const isCompleted = computed(() => complianceStore.complianceStatus.kybCompleted)

const businessTypes = ref([
  { code: '', label: 'Select Business Type' },
  { code: 'registered', label: 'Registered Business' },
  { code: 'starter', label: 'Starter Business' },
])

const industries = ref([
  { code: '', label: 'Select Industry' },
  { code: 'retail', label: 'Retail' },
  { code: 'fashion', label: 'Fashion & Apparel' },
  { code: 'electronics', label: 'Electronics & Gadgets' },
  { code: 'technology-software', label: 'Technology / Software' },
  { code: 'food-groceries', label: 'Food & Groceries' },
  { code: 'health-beauty', label: 'Health & Beauty' },
  { code: 'education-training', label: 'Education & Training' },
  { code: 'agriculture', label: 'Agriculture & Agritech' },
  { code: 'hospitality', label: 'Hospitality & Travel' },
  { code: 'digital', label: 'Digital Goods / Media' },
  { code: 'other', label: 'Other' },
])

const profileForm = ref({
  businessTradingName: '',
  businessType: '',
  businessRegistrationNumber: '',
  businessStorefrontUrl: '',
  businessDescription: '',
  industry: '',
  businessTaxIdNumber: '',
  businessExpectedMonthlyIncome: '',
  businessAddress: '',
  businessState: '',
  businessCity: '',
  cacDocumentUrl: '',
  staffSize: 0,
})

const summaryFields = computed(() => [
  { label: 'Trading Name', value: profileForm.value.businessTradingName },
  { label: 'Industry', value: industries.value.find(i => i.code === profileForm.value.industry)?.label },
  { label: 'Business Type', value: businessTypes.value.find(t => t.code === profileForm.value.businessType)?.label },
  { label: 'Staff Size', value: profileForm.value.staffSize },
  { label: 'Expected Monthly Income', value: `NGN ${profileForm.value.businessExpectedMonthlyIncome}` },
  { label: 'Storefront URL', value: profileForm.value.businessStorefrontUrl },
  { label: 'Address', value: `${profileForm.value.businessAddress}, ${profileForm.value.businessCity}, ${profileForm.value.businessState}` },
])

const isCheckingSlug = ref(false)
const slugValidationError = ref('')

function generateStorefrontUrl(tradingName) {
  if (!tradingName) return ''
  const slug = tradingName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  return `https://${slug}.shopsynch.com`
}

function extractSlugFromUrl(url) {
  const match = url.match(/^https?:\/\/([a-z0-9-]+)\.(shopsync|shopsynch)\.com\/?$/)
  return match ? match[1] : null
}

const debouncedValidateSlug = debounce(validateSlug, 500);

async function validateSlug(url) {
  if (!url || !url.includes('.shopsynch.com')) {
    slugValidationError.value = ''
    return true
  }

  const slug = extractSlugFromUrl(url)
  if (!slug) {
    slugValidationError.value = 'Invalid storefront URL format'
    return false
  }

  isCheckingSlug.value = true
  try {
    const result = await storeStore.checkSlugAvailability(slug)
    if (result.isTaken) {
      slugValidationError.value = `The subdomain "${slug}" is already taken. Please choose a different one.`
      return false
    } else {
      slugValidationError.value = ''
      return true
    }
  } catch (error) {
    console.error('Error validating slug:', error)
    slugValidationError.value = 'Unable to validate subdomain availability'
    return false
  } finally {
    isCheckingSlug.value = false
  }
}

async function updateBusinessProfile(_e) {
  if (slugValidationError.value) {
    toastStore.error('Please fix the storefront URL issue before proceeding.')
    return
  }
  
  await complianceStore.updateBusinessProfile(profileForm.value)
  await complianceStore.fetchComplianceStatus()
  isEditing.value = false
  
  if (props.nextSectionKey) {
    emit('update:currentSection', props.nextSectionKey)
  } else {
    toastStore.success('Business profile updated successfully!')
  }
}

watch(() => complianceStore.isLocked, (locked) => {
  if (locked) isEditing.value = false;
}, { immediate: true })

function handleNext() {
  if (props.nextSectionKey) {
    emit('update:currentSection', props.nextSectionKey)
  }
}

watch(() => complianceStore.businessProfile, (newProfile) => {
  if (newProfile && typeof newProfile === 'object') {
    profileForm.value.businessTradingName = newProfile.businessTradingName || profileForm.value.businessTradingName;
    profileForm.value.legalBusinessName = newProfile.legalBusinessName || profileForm.value.legalBusinessName;
    profileForm.value.businessType = newProfile.businessType || profileForm.value.businessType;
    profileForm.value.businessRegistrationNumber = newProfile.businessRegistrationNumber || profileForm.value.businessRegistrationNumber;
    profileForm.value.businessStorefrontUrl = newProfile.businessStorefrontUrl || profileForm.value.businessStorefrontUrl;
    profileForm.value.businessDescription = newProfile.businessDescription || profileForm.value.businessDescription;
    profileForm.value.industry = newProfile.industry || profileForm.value.industry;
    profileForm.value.businessTaxIdNumber = newProfile.businessTaxIdNumber || profileForm.value.businessTaxIdNumber;
    profileForm.value.businessExpectedMonthlyIncome = newProfile.businessExpectedMonthlyIncome || profileForm.value.businessExpectedMonthlyIncome;
    profileForm.value.businessAddress = newProfile.businessAddress || profileForm.value.businessAddress;
    profileForm.value.businessState = newProfile.businessState || profileForm.value.businessState;
    profileForm.value.businessCity = newProfile.businessCity || profileForm.value.businessCity;
    profileForm.value.cacDocumentUrl = newProfile.cacDocumentUrl || profileForm.value.cacDocumentUrl;
    profileForm.value.staffSize = newProfile.staffSize !== undefined ? newProfile.staffSize : profileForm.value.staffSize;

    // Generate storefront URL if trading name exists but URL is empty
    if (profileForm.value.businessTradingName && !profileForm.value.businessStorefrontUrl) {
      profileForm.value.businessStorefrontUrl = generateStorefrontUrl(profileForm.value.businessTradingName)
    }
  }
}, { immediate: true, deep: true })

watch(() => profileForm.value.businessTradingName, (newTradingName) => {
  if (newTradingName && !profileForm.value.businessStorefrontUrl.includes(newTradingName.toLowerCase())) {
    profileForm.value.businessStorefrontUrl = generateStorefrontUrl(newTradingName)
  }
})

watch(() => profileForm.value.businessStorefrontUrl, (newUrl) => {
  if (newUrl && newUrl.includes('.shopsynch.com')) {
    debouncedValidateSlug(newUrl)
  } else {
    slugValidationError.value = ''
  }
})
</script>

<style scoped>
.text-primary {
  color: #003366;
}
.invalid-feedback {
  color: #FF0000;
  font-size: 1.2rem;
  margin-top: 0.4rem;
  display: block;
}
</style>