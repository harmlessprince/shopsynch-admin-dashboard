<template>
  <span
    class="inline-flex items-center px-[0.8rem] py-[0.2rem] rounded-full text-[1.2rem] font-[500] whitespace-nowrap"
    :class="badgeClass"
  >
    {{ roleName }}
  </span>
</template>

<script setup>
const props = defineProps({
  roleName: { type: String, required: true },
  isBuiltIn: { type: Boolean, default: false },
})

const ROLE_COLORS = {
  'super admin':    'bg-[#003366] text-white',
  'store manager':  'bg-[#DCEBFB] text-[#003366]',
  'viewer':         'bg-[#F5F5F5] text-[#616161]',
}

const badgeClass = computed(() => {
  const key = props.roleName?.toLowerCase()
  return ROLE_COLORS[key] ?? (props.isBuiltIn
    ? 'bg-[#DCEBFB] text-[#003366]'
    : 'bg-[#E8F5E9] text-[#2E7D32]')
})
</script>
