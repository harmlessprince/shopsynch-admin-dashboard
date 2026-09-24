<script setup>
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  productName: {
    type: String,
    default: '',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['cancel', 'confirm'])

const actionLabel = computed(() => props.isArchived ? 'Unarchive product' : 'Archive product')
const consequenceText = computed(() =>
  props.isArchived
    ? 'Unarchiving this product will make it visible to customers again anywhere active products are shown.'
    : 'Archiving this product will hide it from the public storefront. Its data, variants, inventory records, and order history will be retained.'
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      @click.self="emit('cancel')"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel')" />

      <section class="relative w-full max-w-[42rem] rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <p class="text-[1.1rem] font-black uppercase tracking-widest text-slate-400">
              Product visibility
            </p>
            <h3 class="mt-1 text-[2rem] font-black text-slate-950">
              {{ actionLabel }}
            </h3>
          </div>
          <button
            type="button"
            class="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            :disabled="loading"
            @click="emit('cancel')"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[1.4rem] leading-6 text-amber-800">
          <p class="font-bold">
            {{ productName || 'This product' }}
          </p>
          <p class="mt-2">
            {{ consequenceText }}
          </p>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <BaseButton
            variant="outline"
            :disabled="loading"
            @click="emit('cancel')"
          >
            Cancel
          </BaseButton>
          <BaseButton
            :variant="isArchived ? 'primary' : 'danger'"
            :loading="loading"
            @click="emit('confirm')"
          >
            {{ actionLabel }}
          </BaseButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>
