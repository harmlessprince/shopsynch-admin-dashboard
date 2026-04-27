<template>
  <vue-final-modal
    v-slot="{ close }"
    modal-id="userStatusModal"
    :lock-scroll="false"
    @click-outside="close()"
  >
    <div class="w-[calc(100vw-3.2rem)] sm:w-[480px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999999]">
      <div class="bg-white rounded-[10px] shadow">
        <!-- Header -->
        <div class="flex items-center justify-between px-[2.4rem] pt-[2.4rem] pb-[1.6rem] border-b border-[#E0E0E0]">
          <h2 class="font-[600] text-[1.8rem] text-[#1B1B19]">{{ title }}</h2>
          <button
            class="p-[0.4rem] rounded-[6px] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
            @click="close()"
          >
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]">cancel</span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-[2.4rem] py-[2.4rem] flex flex-col gap-y-[1.6rem]">
          <div
            class="flex items-start gap-x-[1rem] rounded-[8px] p-[1.2rem]"
            :class="bannerClass"
          >
            <span
              class="material-symbols-outlined text-[2rem] shrink-0 mt-[0.1rem]"
              :class="iconClass"
            >{{ icon }}</span>
            <p class="text-[1.3rem]" :class="bannerTextClass">{{ bannerMessage }}</p>
          </div>

          <p class="text-[1.4rem] text-[#616161]">
            Are you sure you want to <strong class="text-[#1B1B19]">{{ nextStatus }}</strong> the account for
            <strong class="text-[#1B1B19]">{{ user?.fullName || user?.email }}</strong>?
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
              class="h-[47px] px-[2.4rem] rounded-[10px] text-white text-[1.4rem] font-[600] transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :class="confirmBtnClass"
              :disabled="isSubmitting"
              @click="handleConfirm(close)"
            >
              <span v-if="isSubmitting">Processing<span class="animate-pulse">...</span></span>
              <span v-else>{{ confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
import { VueFinalModal } from 'vue-final-modal'
import { useAdminUsersStore } from '~/stores/adminUsers.store.js'

const props = defineProps({
  user: { type: Object, default: null },
  nextStatus: { type: String, default: 'active' },
})

const emit = defineEmits(['done'])

const adminUsersStore = useAdminUsersStore()
const isSubmitting = ref(false)

const isSuspend = computed(() => props.nextStatus === 'suspended')

const title = computed(() => isSuspend.value ? 'Suspend User' : 'Activate User')
const confirmLabel = computed(() => isSuspend.value ? 'Suspend' : 'Activate')

const bannerClass = computed(() =>
  isSuspend.value
    ? 'bg-amber-50 border border-amber-200'
    : 'bg-green-50 border border-green-200'
)
const bannerTextClass = computed(() => isSuspend.value ? 'text-amber-800' : 'text-green-800')
const iconClass = computed(() => isSuspend.value ? 'text-amber-500' : 'text-green-500')
const icon = computed(() => isSuspend.value ? 'warning' : 'check_circle')
const bannerMessage = computed(() =>
  isSuspend.value
    ? 'This user will be unable to log in or access their account.'
    : "This will restore the user's full access to their account."
)
const confirmBtnClass = computed(() =>
  isSuspend.value
    ? 'bg-amber-500 hover:bg-amber-600'
    : 'bg-green-600 hover:bg-green-700'
)

async function handleConfirm(close) {
  if (!props.user) return
  isSubmitting.value = true
  try {
    await adminUsersStore.updateUserStatus(props.user.id, props.nextStatus)
    emit('done')
    close()
  } finally {
    isSubmitting.value = false
  }
}
</script>
