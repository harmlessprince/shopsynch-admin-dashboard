<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: false,
    default: '',
  },
  pathName: {
    type: String,
    required: false,
    default: null,
  },
})

const route = useRoute()
const destination = computed(() => {
  return props.pathName ? { name: props.pathName } : props.link
})
const isActive = computed(() => route.path === props.link)

</script>

<template>

  <NuxtLink
      :to="destination"
      class="w-full h-[44px] linkContainer hover:bg-[#F0f8ff] hover:text-[#003366] font-[400] text-[#616161] flex flex-row gap-x-[12px] px-[24px] py-[10px] box-border justify-start"
      active-class="font-[700] bg-[#F0F8FF] text-[#003366] border border-[#003366] border-t-0 border-b-0 border-l-0 "
      exact-active-class="font-[700] bg-[#F0F8FF] text-[#003366] border border-[#003366] border-t-0 border-b-0 border-l-0 "
  >
    <span :class="['material-symbols-outlined linkChild', isActive ? 'text-[#003366]' : '']">{{ props.icon }}</span>
    <span
        :class="['text-[16px] leading-[22px] linkChild', isActive ? 'text-[#003366]' : '']"> {{ props.name }} </span>
  </NuxtLink>
</template>

<style scoped>
.linkContainer:hover .linkChild {
  color: "#003366"
}
</style>