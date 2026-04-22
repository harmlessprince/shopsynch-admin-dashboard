<template>
  <!-- Desktop table -->
  <div class="hidden lg:block w-full overflow-x-auto">
    <table class="w-full text-[1.4rem]">
      <thead>
        <tr class="border-b border-[#E0E0E0]">
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Role</th>
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Description</th>
          <th class="text-left py-[1.2rem] pr-[2.4rem] font-[600] text-[#616161]">Members</th>
          <th class="text-right py-[1.2rem] font-[600] text-[#616161]">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.id" class="border-b border-[#F5F5F5] hover:bg-[#fbfbfb] transition-colors">
          <td class="py-[1.4rem] pr-[2.4rem]">
            <div class="flex items-center gap-x-[0.8rem]">
              <span v-if="role.type === 'SYSTEM'" class="material-symbols-outlined text-[1.6rem] text-[#616161]">lock</span>
              <span class="font-[500] text-[#1B1B19]">{{ role.name }}</span>
            </div>
          </td>
          <td class="py-[1.4rem] pr-[2.4rem] text-[#616161] max-w-[300px] truncate">{{ role.description ?? '—' }}</td>
          <td class="py-[1.4rem] pr-[2.4rem] text-[#616161]">{{ role.membersCount ?? 0 }}</td>
          <td class="py-[1.4rem] text-right">
            <div v-if="role.type === 'SYSTEM'">
              <button
                class="text-[1.4rem] text-[#003366] font-[500] hover:underline px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-[#DCEBFB] transition-colors"
                @click="emit('view', role)"
              >
                View
              </button>
            </div>
            <div v-else class="flex items-center justify-end gap-x-[0.8rem]">
              <button
                class="text-[1.4rem] text-[#003366] font-[500] hover:underline px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-[#DCEBFB] transition-colors"
                @click="emit('edit', role)"
              >
                Edit
              </button>
              <button
                class="text-[1.4rem] text-rose-500 font-[500] hover:underline px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-rose-50 transition-colors"
                @click="emit('delete', role)"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Mobile card list -->
  <div class="lg:hidden flex flex-col gap-y-[1.2rem]">
    <div
      v-for="role in roles"
      :key="role.id"
      class="bg-[#fbfbfb] rounded-[10px] p-[1.6rem] flex items-start justify-between gap-x-[1.2rem]"
    >
      <div class="flex flex-col gap-y-[0.6rem]">
        <div class="flex items-center gap-x-[0.6rem]">
          <span v-if="role.type === 'SYSTEM'" class="material-symbols-outlined text-[1.6rem] text-[#616161]">lock</span>
          <span class="font-[600] text-[1.4rem] text-[#1B1B19]">{{ role.name }}</span>
          <span
            class="text-[1rem] px-[0.6rem] py-[0.2rem] rounded-full font-[500]"
            :class="role.type === 'SYSTEM' ? 'bg-[#DCEBFB] text-[#003366]' : 'bg-[#E8F5E9] text-[#2E7D32]'"
          >
            {{ role.type === 'SYSTEM' ? 'Built-in' : 'Custom' }}
          </span>
        </div>
        <span v-if="role.description" class="text-[1.2rem] text-[#616161]">{{ role.description }}</span>
        <span class="text-[1.2rem] text-[#616161]">{{ role.membersCount ?? 0 }} members</span>
      </div>
      <div class="flex flex-col items-end gap-y-[0.6rem] shrink-0">
        <button
          v-if="role.type === 'SYSTEM'"
          class="text-[1.3rem] text-[#003366] font-[500] px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-[#DCEBFB] transition-colors"
          @click="emit('view', role)"
        >
          View
        </button>
        <template v-else>
          <button
            class="text-[1.3rem] text-[#003366] font-[500] px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-[#DCEBFB] transition-colors"
            @click="emit('edit', role)"
          >
            Edit
          </button>
          <button
            class="text-[1.3rem] text-rose-500 font-[500] px-[0.8rem] py-[0.4rem] rounded-[6px] hover:bg-rose-50 transition-colors"
            @click="emit('delete', role)"
          >
            Delete
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  roles: { type: Array, default: () => [] },
})

const emit = defineEmits(['view', 'edit', 'delete'])
</script>
