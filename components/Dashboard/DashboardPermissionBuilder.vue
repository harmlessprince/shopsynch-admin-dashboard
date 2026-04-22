<template>
  <div class="flex flex-col gap-y-[1.2rem]">
    <div v-if="!permissions.length" class="text-[1.4rem] text-[#616161] py-[2rem] text-center">
      No permissions available.
    </div>
    <div
      v-for="group in permissionGroups"
      :key="group.category"
      class="border border-[#E0E0E0] rounded-[10px] overflow-hidden"
    >
      <!-- Group header -->
      <button
        type="button"
        class="w-full flex items-center justify-between px-[1.6rem] py-[1.2rem] bg-[#fbfbfb] hover:bg-[#F5F5F5] transition-colors"
        @click="toggleGroup(group.category)"
      >
        <span class="font-[600] text-[1.4rem] text-[#1B1B19]">{{ group.label }}</span>
        <div class="flex items-center gap-x-[1.2rem]">
          <button
            type="button"
            class="text-[1.2rem] text-[#003366] font-[600] hover:underline"
            @click.stop="toggleSelectAll(group)"
          >
            {{ isAllSelected(group) ? 'Deselect all' : 'Select all' }}
          </button>
          <span class="text-[1.2rem] text-[#616161]">{{ selectedCount(group) }} of {{ group.permissions.length }}</span>
          <span class="material-symbols-outlined text-[2rem] text-[#616161] transition-transform duration-200" :class="{ 'rotate-180': openGroups.has(group.category) }">
            expand_more
          </span>
        </div>
      </button>

      <!-- Permission checkboxes -->
      <div v-if="openGroups.has(group.category)" class="px-[1.6rem] py-[1.2rem] flex flex-col gap-y-[1rem] border-t border-[#E0E0E0]">
        <label
          v-for="perm in group.permissions"
          :key="perm.id"
          class="flex items-start gap-x-[1rem] cursor-pointer select-none"
        >
          <input
            type="checkbox"
            class="w-[1.6rem] h-[1.6rem] mt-[0.2rem] rounded border-[#E0E0E0] text-[#003366] cursor-pointer accent-[#003366] shrink-0"
            :checked="modelValue.includes(perm.id)"
            @change="togglePermission(perm.id)"
          />
          <div class="flex flex-col gap-y-[0.2rem]">
            <span class="text-[1.4rem] text-[#1B1B19]">{{ perm.displayName }}</span>
            <span v-if="perm.description" class="text-[1.2rem] text-[#616161]">{{ perm.description }}</span>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  permissions: { type: Array, default: () => [] },
  defaultExpanded: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const permissionGroups = computed(() => {
  const map = {}
  for (const perm of props.permissions) {
    const cat = perm.category ?? 'Other'
    if (!map[cat]) map[cat] = []
    map[cat].push(perm)
  }
  return Object.entries(map).map(([category, permissions]) => ({
    category,
    label: category,
    permissions,
  }))
})

const openGroups = ref(new Set())

watch(permissionGroups, (groups) => {
  if (props.defaultExpanded) {
    openGroups.value = new Set(groups.map(g => g.category))
  }
}, { immediate: true })

function toggleGroup(category) {
  const next = new Set(openGroups.value)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  openGroups.value = next
}

function togglePermission(permId) {
  const next = props.modelValue.includes(permId)
    ? props.modelValue.filter(id => id !== permId)
    : [...props.modelValue, permId]
  emit('update:modelValue', next)
}

function isAllSelected(group) {
  return group.permissions.every(p => props.modelValue.includes(p.id))
}

function selectedCount(group) {
  return group.permissions.filter(p => props.modelValue.includes(p.id)).length
}

function toggleSelectAll(group) {
  const allIds = group.permissions.map(p => p.id)
  if (isAllSelected(group)) {
    emit('update:modelValue', props.modelValue.filter(id => !allIds.includes(id)))
  } else {
    emit('update:modelValue', [...new Set([...props.modelValue, ...allIds])])
  }
}
</script>
