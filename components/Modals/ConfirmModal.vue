<template>
  <VueFinalModal
    v-slot="{ params, close }"
    name="ConfirmModal"
    :lock-scroll="false"
    @click-outside="!isSubmitting && close()"
  >
    <div
      class="absolute left-1/2 top-1/2 z-[99999999] w-[calc(100vw-3.2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      <div class="rounded-[10px] bg-white shadow">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#E0E0E0] px-[2.4rem] pb-[1.6rem] pt-[2.4rem]">
          <h2 id="confirm-modal-title" class="text-[1.8rem] font-[600] text-[#1B1B19]">
            {{ modalTitle ?? params?.modalTitle ?? 'Confirm Action' }}
          </h2>
          <button
            type="button"
            class="flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-[6px] transition-colors hover:bg-[#F5F5F5] focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            aria-label="Close modal"
            :disabled="isSubmitting"
            @click="close()"
          >
            <span class="material-symbols-outlined text-[2.4rem] text-[#616161]" aria-hidden="true">cancel</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex flex-col gap-y-[2rem] px-[2.4rem] py-[2.4rem]">
          <p id="confirm-modal-description" class="text-[1.5rem] text-[#616161]">
            {{ prompt ?? params?.prompt ?? "Are you sure ?" }}
          </p>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-[1.2rem] pt-[0.8rem]">
            <BaseButton
              type="button"
              variant="outline"
              class="h-[4.7rem] rounded-[10px] px-[2.4rem] w-[48%]"
              :disabled="isSubmitting"
              @click.stop="close()"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="button"
              variant="danger"
              class="h-[4.7rem] rounded-[10px] px-[2.4rem] w-[48%]"
              :loading="isSubmitting"
              :disabled="isSubmitting"
              @click="confirm(close)"
            >
              {{ confirmLabel }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </VueFinalModal>
</template>

<script setup>
import { VueFinalModal } from 'vue-final-modal'

const props = defineProps({
  modalTitle: { type: String, default: undefined },
  prompt: { type: String, default: undefined },
  confirmLabel: { type: String, default: 'Confirm' },
  isSubmitting: { type: Boolean, default: false }
})

const emit = defineEmits(["confirm"]);

function confirm(close) {
  emit("confirm", close);
}
</script>
