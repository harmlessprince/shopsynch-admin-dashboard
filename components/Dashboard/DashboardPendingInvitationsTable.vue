<template>
  <!-- Desktop table -->
  <div class="hidden lg:block w-full overflow-x-auto">
    <table class="w-full text-[1.4rem]">
      <thead>
        <tr class="border-b border-[#E0E0E0]">
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Email</th>
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Role</th>
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Expires</th>
          <th class="text-right py-[1.2rem] font-[600] text-[#616161]">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invite in invitations" :key="invite.id" class="border-b border-[#F5F5F5] hover:bg-[#fbfbfb] transition-colors">
          <td class="py-[1.4rem] pr-[2.4rem] text-[#1B1B19]">{{ invite.email }}</td>
          <td class="py-[1.4rem] pr-[2.4rem]">
            <div class="flex flex-wrap gap-[0.4rem]">
              <DashboardRoleBadge
                v-for="rId in invite.roleIds"
                :key="rId"
                :role-name="getRoleName(rId)"
              />
            </div>
          </td>
          <td class="py-[1.4rem] pr-[2.4rem] text-[#616161]">{{ formatDate(invite.expiresAt) }}</td>
          <td class="py-[1.4rem] text-right">
            <button
              class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] text-[#616161] transition-colors"
              @click.stop="toggleMenu(invite.id, $event)"
            >
              <span class="material-symbols-outlined text-[2rem]">more_horiz</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Mobile card list -->
  <div class="lg:hidden flex flex-col gap-y-[1.2rem]">
    <div
      v-for="invite in invitations"
      :key="invite.id"
      class="bg-[#fbfbfb] rounded-[10px] p-[1.6rem] flex items-start justify-between gap-x-[1.2rem]"
    >
      <div class="flex flex-col gap-y-[0.4rem]">
        <span class="font-[500] text-[1.4rem] text-[#1B1B19]">{{ invite.email }}</span>
        <div class="flex flex-wrap gap-[0.4rem] mt-[0.4rem]">
          <DashboardRoleBadge
            v-for="rId in invite.roleIds"
            :key="rId"
            :role-name="getRoleName(rId)"
          />
        </div>
        <span class="text-[1.2rem] text-[#616161]">Expires {{ formatDate(invite.expiresAt) }}</span>
      </div>
      <button
        class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] text-[#616161]"
        @click.stop="toggleMenu(invite.id, $event)"
      >
        <span class="material-symbols-outlined text-[2rem]">more_horiz</span>
      </button>
    </div>
  </div>

  <!-- Teleported dropdown — escapes overflow clipping -->
  <Teleport to="body">
    <div
      v-if="openMenuId"
      class="fixed z-[99999] w-[180px] bg-white rounded-[10px] shadow-lg border border-[#E0E0E0] overflow-hidden"
      :style="{ top: menuPos.top, right: menuPos.right }"
    >
      <button
        class="w-full text-left px-[1.6rem] py-[1rem] text-[1.4rem] hover:bg-[#fbfbfb] transition-colors"
        @click="emitAction('resend')"
      >
        Resend Invite
      </button>
      <button
        class="w-full text-left px-[1.6rem] py-[1rem] text-[1.4rem] text-rose-500 hover:bg-rose-50 transition-colors"
        @click="emitAction('cancel')"
      >
        Cancel Invite
      </button>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  invitations: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
})

const emit = defineEmits(['resend', 'cancel'])

const openMenuId = ref(null)
const menuPos = ref({ top: '0px', right: '0px' })

function getRoleName(roleId) {
  return props.roles.find(r => r.id === roleId)?.name ?? roleId
}

function toggleMenu(id, event) {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  menuPos.value = {
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
  openMenuId.value = id
}

function emitAction(action) {
  const invite = props.invitations.find(i => i.id === openMenuId.value)
  if (invite) emit(action, invite)
  openMenuId.value = null
}

function handleDocumentClick() {
  openMenuId.value = null
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onUnmounted(() => document.removeEventListener('click', handleDocumentClick))

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
