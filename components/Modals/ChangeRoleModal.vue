<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="changeRoleModal"
    :lock-scroll="false"
    @click-outside="close()"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[560px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0]">
          <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">Change Role — {{ member?.fullName }}</h2>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer" @click="close()">
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[2rem]">
          <p class="text-[1.4rem] text-[#616161]">Current role: <span class="font-[500] text-[#1B1B19]">{{ member?.role?.name ?? '—' }}</span></p>

          <div class="flex flex-col gap-y-[0.6rem]">
            <label class="text-[1.4rem] font-[500] text-[#1B1B19]">New role <span class="text-rose-500">*</span></label>
            <select
              v-model="selectedRoleId"
              class="w-full h-[47px] border border-[#E0E0E0] rounded-[10px] py-[12px] px-[16px] text-[1.4rem] outline-none bg-white focus:border-[#003366] transition-colors cursor-pointer"
            >
              <option value="">Select a role</option>
              <option v-for="role in roles" :key="role.id" :value="role.id" :disabled="role.id === member?.role?.id">
                {{ role.name }}
              </option>
            </select>
            <div v-if="selectedRoleHint" class="flex items-start gap-x-[0.8rem] bg-[#fbfbfb] rounded-[8px] p-[1.2rem]">
              <span class="material-symbols-outlined text-[1.8rem] text-[#616161] shrink-0 mt-[0.1rem]">info</span>
              <p class="text-[1.3rem] text-[#616161]">{{ selectedRoleHint }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-x-[1.2rem] pt-[0.8rem]">
            <button
              type="button"
              class="h-[47px] px-[2.4rem] rounded-[10px] border border-[#E0E0E0] text-[1.4rem] font-[500] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="close()"
            >
              Cancel
            </button>
            <button
              class="h-[47px] px-[2.4rem] rounded-[10px] bg-[#003366] text-white text-[1.4rem] font-[600] hover:bg-[#002244] transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :disabled="!selectedRoleId || selectedRoleId === member?.role?.id || isSubmitting"
              @click="handleSubmit(close)"
            >
              <span v-if="isSubmitting">Updating<span class="animate-pulse">...</span></span>
              <span v-else>Update Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { VueFinalModal } from 'vue-final-modal'
import { useTeamStore } from '~/stores/team.store.js'
import { useAuthStore } from '~/stores/auth.store.js'
import { useToastStore } from '~/stores/toast.store.js'

const props = defineProps({
  member: { type: Object, default: null },
  roles:  { type: Array, default: () => [] },
})

const emit = defineEmits(['updated'])

const teamStore = useTeamStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

const selectedRoleId = ref('')
const isSubmitting = ref(false)

const ROLE_HINTS = {
  'store manager': 'Store Managers can process orders, manage products and view reports. They cannot manage team or billing.',
  'viewer': 'Viewers have read-only access to orders, products, and reports.',
  'super admin': 'Super Admins have full access to everything in the store.',
}

const selectedRoleHint = computed(() => {
  const role = props.roles.find(r => r.id === selectedRoleId.value)
  if (!role) return ''
  return ROLE_HINTS[role.name?.toLowerCase()] ?? role.description ?? ''
})

watch(() => props.member, (m) => {
  selectedRoleId.value = m?.role?.id ?? ''
}, { immediate: true })

async function handleSubmit(close) {
  if (!selectedRoleId.value || !props.member) return
  isSubmitting.value = true
  try {
    await teamStore.updateMemberRole(authStore.user?.lastActiveTenantId, props.member.id, { roleIds: [selectedRoleId.value] })
    toastStore.success(`Role updated for ${props.member.fullName}`)
    emit('updated')
    close()
  } finally {
    isSubmitting.value = false
  }
}
</script>
