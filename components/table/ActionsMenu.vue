<template>
  <div ref="menuRef" class="relative">
    <div class="flex items-center justify-center">
      <button
        ref="buttonRef"
        type="button"
        class="min-h-[44px] min-w-[44px] p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center touch-manipulation"
        aria-label="Actions menu"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        @click.stop="emit('toggle')"
      >
        <span class="material-symbols-outlined text-[32px] text-slate-500" aria-hidden="true">
          more_horiz
        </span>
      </button>

      <Teleport to="body">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="dt-action-menu-container fixed w-[150px] transition-opacity duration-75"
          :class="isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'"
          :style="panelStyle"
          role="menu"
          @click="emit('close')"
        >
          <slot />
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useClickOutside } from '~/composables/useClickOutside.js'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});
const emit = defineEmits(["toggle", "close"]);

const menuRef = ref(null)
const buttonRef = ref(null)
const panelRef = ref(null)
const isPositioned = ref(false)
const menuPosition = ref({ top: 0, left: 0 })

const panelStyle = computed(() => ({
  top: `${menuPosition.value.top}px`,
  left: `${menuPosition.value.left}px`,
}))

function calculatePosition() {
  if (!buttonRef.value || typeof window === 'undefined') return

  const buttonRect = buttonRef.value.getBoundingClientRect()
  const menuWidth = 150
  const gap = 4
  const viewportPadding = 12

  let left = buttonRect.right - menuWidth
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding))

  let top = buttonRect.bottom + gap
  menuPosition.value = { top, left }
  isPositioned.value = true
}

async function updatePosition() {
  if (!props.isOpen || !buttonRef.value || typeof window === 'undefined') return
  calculatePosition()
  await nextTick()

  const buttonRect = buttonRef.value.getBoundingClientRect()
  const gap = 4
  const viewportPadding = 12
  let left = menuPosition.value.left
  let top = buttonRect.bottom + gap

  const panelHeight = panelRef.value?.getBoundingClientRect().height || 0
  if (panelHeight && top + panelHeight > window.innerHeight - viewportPadding) {
    top = Math.max(viewportPadding, buttonRect.top - panelHeight - gap)
    menuPosition.value = { top, left }
  }
}

useClickOutside([menuRef, panelRef], () => {
  if (props.isOpen) {
    emit('close')
  }
})

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (typeof window === 'undefined') return
    if (!isOpen) {
      isPositioned.value = false
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      return
    }

    calculatePosition()
    await nextTick()
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
  }
})
</script>