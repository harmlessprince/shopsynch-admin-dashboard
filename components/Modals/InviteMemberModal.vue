<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="inviteMemberModal"
    :lock-scroll="false"
    @click-outside="handleClose( close )"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[560px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0]">
          <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">Invite Team Member</h2>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer" @click="handleClose(close)">
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Body -->
        <Form :validation-schema="schema" @submit="handleSubmit($event, close)" class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[2rem]">
          <!-- Email -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="text-[1.4rem] font-[500] text-[#1B1B19]">Email address <span class="text-rose-500">*</span></label>
            <Field name="email" v-slot="{ field, errors }">
              <input
                v-bind="field"
                type="email"
                placeholder="e.g. ada@example.com"
                class="w-full h-[47px] border rounded-[10px] py-[12px] px-[16px] text-[1.4rem] outline-none transition-colors"
                :class="errors.length ? 'border-rose-400 bg-rose-50' : 'border-[#E0E0E0] focus:border-[#003366]'"
              />
              <span v-if="errors.length" class="text-[1.2rem] text-rose-500">{{ errors[0] }}</span>
            </Field>
            <span v-if="serverEmailError" class="text-[1.2rem] text-rose-500">{{ serverEmailError }}</span>
          </div>

          <!-- Role -->
          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="text-[1.4rem] font-[500] text-[#1B1B19]">Assign role <span class="text-rose-500">*</span></label>
            <Field name="roleId" v-slot="{ field, errors }">
              <select
                v-bind="field"
                class="w-full h-[47px] border rounded-[10px] py-[12px] px-[16px] text-[1.4rem] outline-none bg-white transition-colors cursor-pointer"
                :class="errors.length ? 'border-rose-400' : 'border-[#E0E0E0] focus:border-[#003366]'"
                @change="onRoleChange(field.value)"
              >
                <option value="">Select a role</option>
                <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
              <span v-if="errors.length" class="text-[1.2rem] text-rose-500">{{ errors[0] }}</span>
            </Field>
            <div v-if="selectedRoleHint" class="flex items-start gap-x-[0.8rem] bg-[#fbfbfb] rounded-[8px] p-[1.2rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-[#616161] shrink-0 mt-[0.1rem]">info</span>
              <p class="text-[1.3rem] text-[#616161]">{{ selectedRoleHint }}</p>
            </div>
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
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting">Sending<span class="animate-pulse">...</span></span>
              <span v-else>Send Invitation</span>
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
import { inviteMemberSchema } from '~/schemas/teamSchema'
import { useTeamStore } from '~/stores/team.store.js'
import { useAuthStore } from '~/stores/auth.store.js'

const props = defineProps({
  roles: { type: Array, default: () => [] },
})

const emit = defineEmits(['invited'])

const teamStore = useTeamStore()
const authStore = useAuthStore()

const schema = inviteMemberSchema
const isSubmitting = ref(false)
const serverEmailError = ref('')
const selectedRoleHint = ref('')

const ROLE_HINTS = {
  'store manager': 'Store Managers can process orders, manage products and view reports. They cannot manage team or billing.',
  'viewer': 'Viewers have read-only access to orders, products, and reports.',
  'super admin': 'Super Admins have full access to everything in the store.',
}

function onRoleChange(roleId) {
  const role = props.roles.find(r => r.id === roleId)
  if (!role) { selectedRoleHint.value = ''; return }
  selectedRoleHint.value = ROLE_HINTS[role.name?.toLowerCase()] ?? role.description ?? ''
}

async function handleSubmit(values, close) {
  serverEmailError.value = ''
  isSubmitting.value = true
  try {
    const payload = { email: values.email, roleIds: [values.roleId] }
    await teamStore.inviteUser(authStore.user?.lastActiveTenantId, payload)
    emit('invited')
    close()
  } catch (err) {
    const status = err?.response?.status ?? err?.statusCode
    if (status === 409) {
      serverEmailError.value = err?.data?.message ?? 'This email is already a member or has a pending invitation.'
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleClose(close) {
  serverEmailError.value = ''
  selectedRoleHint.value = ''
 if (close && close instanceof Function) {
    close();
  }
}
</script>
