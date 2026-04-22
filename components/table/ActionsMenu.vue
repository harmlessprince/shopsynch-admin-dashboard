<template>
  <div class="relative">
    <div class="flex items-center justify-center">
      <button
        type="button"
        class="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
        @click.stop="emit('toggle')"
      >
        <span class="material-symbols-outlined text-[32px] text-slate-500">
          more_horiz
        </span>
      </button>

      <div
        v-if="isOpen"
        class="dt-action-menu-container absolute right-0 top-full mt-1 w-[150px]"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(["toggle"]);
</script>