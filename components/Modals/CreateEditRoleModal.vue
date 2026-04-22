<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="createEditRoleModal"
    :lock-scroll="false"
    @click-outside="handleClose(close)"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[600px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0]">
          <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">{{ isEdit ? 'Edit Role' : 'Create Role' }}</h2>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer" @click="handleClose(close)">
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Form -->
        <Form :validation-schema="schema" :initial-values="initialValues" @submit="handleSubmit($event, close)" class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[2rem]">
          <!-- Role name -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="text-[1.4rem] font-[500] text-[#1B1B19]">Role name <span class="text-rose-500">*</span></label>
            <Field name="name" v-slot="{ field, errors }">
              <input
                v-bind="field"
                type="text"
                placeholder="e.g. Warehouse Staff"
                class="w-full h-[47px] border rounded-[10px] py-[12px] px-[16px] text-[1.4rem] outline-none transition-colors"
                :class="errors.length ? 'border-rose-400 bg-rose-50' : 'border-[#E0E0E0] focus:border-[#003366]'"
              />
              <span v-if="errors.length" class="text-[1.2rem] text-rose-500">{{ errors[0] }}</span>
            </Field>
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="text-[1.4rem] font-[500] text-[#1B1B19]">Description <span class="text-[#616161] font-[400]">(optional)</span></label>
            <Field name="description" v-slot="{ field }">
              <textarea
                v-bind="field"
                rows="3"
                placeholder="Briefly describe what this role is for"
                class="w-full border border-[#E0E0E0] rounded-[10px] py-[12px] px-[16px] text-[1.4rem] outline-none resize-none focus:border-[#003366] transition-colors"
              />
            </Field>
          </div>

          <!-- Permissions -->
          <div class="flex flex-col gap-y-[1rem]">
            <p class="text-[1.2rem] font-[700] tracking-widest text-[#616161] uppercase">Permissions</p>
            <Field name="permissionIds" v-slot="{ value, handleChange, errors }">
              <DashboardPermissionBuilder
                :model-value="value"
                @update:model-value="(val) => { selectedPermissions = val; handleChange(val) }"
                :permissions="teamStore.permissions"
                :default-expanded="!isMobile"
              />
              <span v-if="errors.length" class="text-[1.2rem] text-rose-500">{{ errors[0] }}</span>
            </Field>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-x-[1.2rem] pt-[0.8rem]">
            <button
              type="button"
              class="h-[47px] px-[2.4rem] rounded-[10px] border border-[#E0E0E0] text-[1.4rem] font-[500] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="handleClose(close)"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="h-[47px] px-[2.4rem] rounded-[10px] bg-[#003366] text-white text-[1.4rem] font-[600] hover:bg-[#002244] transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :disabled="isSubmitting || selectedPermissions.length === 0"
            >
              <span v-if="isSubmitting">Saving<span class="animate-pulse">...</span></span>
              <span v-else>{{ isEdit ? 'Update Role' : 'Save Role' }}</span>
            </button>
          </div>
        </Form>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { VueFinalModal } from 'vue-final-modal'
import { Form, Field } from 'vee-validate'
import { createRoleSchema } from '~/schemas/teamSchema'
import { useTeamStore } from '~/stores/team.store.js'
import { useAuthStore } from '~/stores/auth.store.js'

const props = defineProps({
  role: { type: Object, default: null },
})

const emit = defineEmits(['saved'])

const teamStore = useTeamStore()
const authStore = useAuthStore()

const schema = createRoleSchema
const isSubmitting = ref(false)
const selectedPermissions = ref([])
const isMobile = ref(false)

const isEdit = computed(() => !!props.role)

const initialValues = computed(() => ({
  name: props.role?.name ?? '',
  description: props.role?.description ?? '',
  permissionIds: props.role?.permissions?.map(p => p.id) ?? [],
}))

watch(() => props.role, (r) => {
  selectedPermissions.value = r?.permissions?.map(p => p.id) ?? []
}, { immediate: true })

onMounted(() => {
  isMobile.value = window.innerWidth < 768
})

async function handleSubmit(values, close) {
  isSubmitting.value = true
  const payload = { ...values, permissionIds: selectedPermissions.value }
  try {
    if (isEdit.value) {
      await teamStore.updateRole(authStore.user?.lastActiveTenantId, props.role.id, payload)
    } else {
      await teamStore.createRole(authStore.user?.lastActiveTenantId, payload)
    }
    emit('saved')
    close()
  } finally {
    isSubmitting.value = false
  }
}

function handleClose(close) {
  selectedPermissions.value = props.role?.permissions?.map(p => p.id) ?? []
  close()
}
</script>
