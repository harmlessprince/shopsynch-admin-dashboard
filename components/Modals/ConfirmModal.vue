<template>
  <VueFinalModal
    v-slot="{ params, close }"
    name="ConfirmModal"
    modal-id="ConfirmModal"
    :lock-scroll="false"
    @click-outside="!isSubmitting && close()"
    @before-open="onBeforeOpen(params)"
    @closed="onClosed"
  >
    <div
      class="absolute left-1/2 top-1/2 z-[99999999] w-[calc(100vw-3.2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      <div class="rounded-[12px] bg-white shadow-xl overflow-hidden border border-[#E0E0E0]">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#E0E0E0] px-[2.4rem] pb-[1.6rem] pt-[2.4rem] bg-[#FAFAFA]">
          <h2 id="confirm-modal-title" class="text-[1.8rem] font-[700] text-[#1B1B19]">
            {{ modalTitle ?? params?.modalTitle ?? 'Confirm Action' }}
          </h2>
          <button
            type="button"
            class="flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-[6px] transition-colors hover:bg-[#EBEBEB] focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer text-[#616161]"
            aria-label="Close modal"
            :disabled="isSubmitting"
            @click="close()"
          >
            <span class="material-symbols-outlined text-[2.4rem]" aria-hidden="true">cancel</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex flex-col gap-y-[1.8rem] px-[2.4rem] py-[2.4rem]">
          <p id="confirm-modal-description" class="text-[1.4rem] text-[#475569] leading-relaxed">
            {{ prompt ?? params?.prompt ?? "Are you sure ?" }}
          </p>

          <!-- Challenge Text Confirmation (when required) -->
          <div v-if="resolvedChallengeText(params)" class="flex flex-col gap-y-[1.2rem] rounded-[10px] bg-amber-50/80 border border-amber-200 p-[1.4rem]">
            <p class="text-[1.3rem] text-amber-900 font-[500]">
              {{ challengeInstructions ?? params?.challengeInstructions ?? "This section is under review or already prefilled. To confirm this update, please type the code below:" }}
            </p>
            <div class="flex items-center justify-center py-[0.8rem] px-[1.2rem] bg-white rounded-[8px] border border-amber-300 font-mono font-[700] text-[1.6rem] tracking-wider text-amber-950 select-all">
              {{ resolvedChallengeText(params) }}
            </div>
            <div class="flex flex-col gap-y-[0.6rem]">
              <label class="text-[1.2rem] font-[600] text-slate-700">Enter confirmation text:</label>
              <input
                v-model="enteredText"
                type="text"
                :placeholder="resolvedChallengeText(params)"
                class="h-12 w-full rounded-lg border border-slate-300 px-3 text-[1.4rem] font-mono text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 bg-white"
                @keyup.enter="canSubmit(params) && confirm(close, params)"
              >
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-[1.2rem] pt-[0.8rem] border-t border-slate-100">
            <BaseButton
              type="button"
              variant="outline"
              class="h-[4.4rem] rounded-[8px] px-[2.4rem] flex-1 text-[1.4rem]"
              :disabled="isSubmitting"
              @click.stop="close()"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="button"
              :variant="variant ?? params?.variant ?? 'danger'"
              class="h-[4.4rem] rounded-[8px] px-[2.4rem] flex-1 text-[1.4rem]"
              :loading="isSubmitting"
              :disabled="isSubmitting || !canSubmit(params)"
              @click="confirm(close, params)"
            >
              {{ confirmLabel ?? params?.confirmLabel ?? 'Confirm' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </VueFinalModal>
</template>

<script setup>
import { ref } from 'vue'
import { VueFinalModal } from 'vue-final-modal'

const props = defineProps({
  modalTitle: { type: String, default: undefined },
  prompt: { type: String, default: undefined },
  confirmLabel: { type: String, default: 'Confirm' },
  variant: { type: String, default: 'danger' },
  isSubmitting: { type: Boolean, default: false },
  challengeText: { type: String, default: undefined },
  challengeInstructions: { type: String, default: undefined }
})

const emit = defineEmits(["confirm", "closed"]);

const enteredText = ref('')

function resolvedChallengeText(params) {
  return props.challengeText ?? params?.challengeText ?? ''
}

function canSubmit(params) {
  const challenge = resolvedChallengeText(params)
  if (!challenge) return true
  return enteredText.value.trim() === challenge.trim()
}

function onBeforeOpen() {
  enteredText.value = ''
}

function onClosed() {
  enteredText.value = ''
  emit('closed')
}

function confirm(close, params) {
  if (!canSubmit(params)) return
  if (params?.onConfirm && typeof params.onConfirm === 'function') {
    params.onConfirm(close)
  }
  emit("confirm", close);
}
</script>
