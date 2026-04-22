<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="viewRoleModal"
    :lock-scroll="false"
    @click-outside="close()"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[560px] max-h-[90vh] overflow-y-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.2rem] border-b border-[#E0E0E0]">
          <div>
            <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">{{ role?.name }}</h2>
            <p class="text-[1.2rem] text-[#616161] mt-[0.2rem]">Built-in role · Read-only</p>
          </div>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer" @click="close()">
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Permissions -->
        <div class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[2rem]">
          <p class="text-[1.2rem] font-[700] tracking-widest text-[#616161] uppercase">Permissions</p>

          <div v-if="!permissionGroups.length" class="text-[1.4rem] text-[#616161]">
            No permissions assigned to this role.
          </div>

          <div
            v-for="group in permissionGroups"
            :key="group.category"
            class="flex flex-col gap-y-[0.8rem]"
          >
            <p class="font-[600] text-[1.4rem] text-[#1B1B19]">{{ group.category }}</p>
            <div class="flex flex-col gap-y-[0.6rem] pl-[0.4rem]">
              <div v-for="perm in group.permissions" :key="perm.id" class="flex items-center gap-x-[1rem]">
                <span class="material-symbols-outlined text-[1.8rem] text-[#2DCC70]">check_circle</span>
                <span class="text-[1.4rem] text-[#1B1B19]">{{ perm.displayName }}</span>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-[0.8rem]">
            <button
              class="h-[47px] px-[2.4rem] rounded-[10px] border border-[#E0E0E0] text-[1.4rem] font-[500] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="close()"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { VueFinalModal } from 'vue-final-modal'

const props = defineProps({
  role: { type: Object, default: null },
})

const permissionGroups = computed(() => {
  const perms = props.role?.permissions ?? []
  const map = {}
  for (const perm of perms) {
    const cat = perm.category ?? 'Other'
    if (!map[cat]) map[cat] = []
    map[cat].push(perm)
  }
  return Object.entries(map).map(([category, permissions]) => ({ category, permissions }))
})
</script>
