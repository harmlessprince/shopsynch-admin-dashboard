<template>
  <Transition name="global-error-alert">
    <div
      v-if="errorStore.persistentError"
      class="fixed left-1/2 top-[1.6rem] z-[120] w-[calc(100%-2rem)] max-w-[720px] -translate-x-1/2 rounded-[10px] border border-rose-200 bg-white px-[1.6rem] py-[1.4rem] text-[#111827] shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
      role="alert"
      aria-live="assertive"
    >
      <div class="flex items-start gap-[1.2rem]">
        <span class="material-symbols-outlined mt-[0.1rem] shrink-0 text-[2.2rem] text-rose-500" aria-hidden="true">
          error
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-[1.4rem] font-[700] leading-[1.4]">
            {{ errorStore.persistentError.title }}
          </p>
          <p class="mt-[0.4rem] whitespace-pre-line break-words text-[1.3rem] leading-[1.6] text-[#475467]">
            {{ errorStore.persistentError.message }}
          </p>
          <p
            v-if="errorStore.persistentError.resolution"
            class="mt-[0.4rem] text-[1.2rem] font-[500] leading-[1.5] text-[#475467]"
          >
            {{ errorStore.persistentError.resolution }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-[8px] text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
          aria-label="Close message"
          @click="errorStore.clearPersistentError()"
        >
          <span class="material-symbols-outlined text-[2rem]" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const errorStore = useErrorStore();
</script>

<style scoped>
.global-error-alert-enter-active,
.global-error-alert-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.global-error-alert-enter-from,
.global-error-alert-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
