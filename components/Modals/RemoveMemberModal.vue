<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="removeMemberModal"
    :lock-scroll="false"
    @click-outside="close()"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[560px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0]">
          <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">Remove {{ member?.fullName }}?</h2>
          <button class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer" @click="close()">
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[1.6rem]">
          <p class="text-[1.4rem] text-[#616161] leading-[1.6]">
            {{ genderPronoun }} will immediately lose access to this store.<br />
            This action cannot be undone.
          </p>

          <div class="flex items-center justify-end gap-x-[1.2rem] pt-[0.8rem]">
            <button
              type="button"
              class="h-[47px] px-[2.4rem] rounded-[10px] border border-[#E0E0E0] text-[1.4rem] font-[500] text-[#616161] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              @click="close()"
            >
              Cancel
            </button>
            <button
              class="h-[47px] px-[2.4rem] rounded-[10px] bg-rose-500 text-white text-[1.4rem] font-[600] hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :disabled="isSubmitting"
              @click="handleSubmit(close)"
            >
              <span v-if="isSubmitting">Removing<span class="animate-pulse">...</span></span>
              <span v-else>Remove Member</span>
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
})

const emit = defineEmits(['removed'])

const teamStore = useTeamStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const isSubmitting = ref(false)

const genderPronoun = computed(() => 'They')

async function handleSubmit(close) {
  if (!props.member) return
  isSubmitting.value = true
  try {
    await teamStore.removeMember(authStore.user.id, props.member.id)
    toastStore.success(`${props.member.fullName} has been removed`)
    emit('removed')
    close()
  } finally {
    isSubmitting.value = false
  }
}
</script>
