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
        :validation-schema="complianceAccountFormSchema"
        :initial-values="accountForm"
        :key="complianceStore.bankAccounts?.[0]?.id || 'new-account'"
        @submit="updateBusinessAccount"
    >
      <div>
        <FormLabel name="Account number" label-for="accountNumber"/>
        <FormInput
            v-model="accountForm.accountNumber" type="text"
            placeholder="Enter your business account number" name="accountNumber"
            maxlength="10"
            :disabled="complianceStore.isLocked"
        />
        <span class="invalid-feedback">{{ errors.accountNumber }}</span>
      </div>

      <div>
        <FormLabel name="Bank" label-for="bankCode"/>
        <Field
            v-model="accountForm.bankCode"
            name="bankCode"
            class="mt-[4px] rounded-[10px] border border-[#E0E0E0] w-full h-[47px] outline-none px-[1.6rem] bg-white focus:border-primary transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            as="select"
            :disabled="complianceStore.isLocked"
        >
          <option value="">Select bank</option>
          <option v-for="bank in complianceStore.banks" :key="bank.code" :value="bank.code">{{ bank.name }}</option>
        </Field>
        <span class="invalid-feedback">{{ errors.bankCode }}</span>
      </div>

      <div>
        <FormLabel name="Account name" label-for="accountName"/>
        <div class="relative">
          <FormInput
              v-model="accountForm.accountName" type="text"
              placeholder="Account name will show here" name="accountName"
              readonly
              class="bg-gray-50"
          />
          <div v-if="isResolvingAccount" class="absolute right-4 top-1/2 -translate-y-1/2">
             <span class="material-symbols-outlined animate-spin text-primary">sync</span>
          </div>
        </div>
        <span class="invalid-feedback">{{ errors.accountName }}</span>
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
            :disabled="!meta.valid || formsIsUnchanged(meta) || isResolvingAccount || complianceStore.isLocked"
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
import { complianceAccountFormSchema } from "~/schemas/complianceSchema.js";
import { useComplianceStore } from "~/stores/compliance.store.js";

const props = defineProps({
  nextSectionKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:currentSection', 'complete'])

const complianceStore = useComplianceStore()

const isEditing = ref(false)
const isCompleted = computed(() => complianceStore.complianceStatus.bankAccountVerified)

const accountForm = ref({
  accountNumber: '',
  bankCode: '',
  accountName: '',
  gateway: 'PAYSTACK'
})

const summaryFields = computed(() => [
  { label: 'Bank', value: complianceStore.banks.find(b => b.code === accountForm.value.bankCode)?.name },
  { label: 'Account Number', value: accountForm.value.accountNumber },
  { label: 'Account Name', value: accountForm.value.accountName },
])

const isResolvingAccount = ref(false)

function formsIsUnchanged(meta) {
  return !meta.dirty
}

async function resolveAccount() {
  if (accountForm.value.accountNumber.length === 10 && accountForm.value.bankCode) {
    isResolvingAccount.value = true
    try {
      const response = await complianceStore.resolveAccountNumber({
        accountNumber: accountForm.value.accountNumber,
        bankCode: accountForm.value.bankCode,
        gateway: accountForm.value.gateway
      })
      if (response?.status && response?.data) {
        accountForm.value.accountName = response.data.resolvedName || response.data.accountName || ''
      } else {
        accountForm.value.accountName = ''
      }
    } catch (error) {
      console.error('Error resolving account:', error)
      accountForm.value.accountName = ''
    } finally {
      isResolvingAccount.value = false
    }
  }
}

watch(() => [accountForm.value.accountNumber, accountForm.value.bankCode], () => {
  resolveAccount()
})

async function updateBusinessAccount() {
  await complianceStore.addBankDetails(accountForm.value)
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

watch(() => complianceStore.bankAccounts, (accounts) => {
  if (accounts && Array.isArray(accounts) && accounts.length > 0) {
    const primaryAccount = accounts.find(a => a.isPrimary) || accounts[0]
    accountForm.value.accountNumber = primaryAccount.accountNumber || accountForm.value.accountNumber
    accountForm.value.bankCode = primaryAccount.bankCode || accountForm.value.bankCode
    accountForm.value.accountName = primaryAccount.accountName || accountForm.value.accountName
    accountForm.value.gateway = primaryAccount.gateway || accountForm.value.gateway || 'PAYSTACK'
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