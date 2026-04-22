<script setup>
defineProps({
  fluid: {
    type: Boolean,
    default: false
  },
  noPadding: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div 
    :class="[
      'flex-1 flex flex-col',
      !noPadding && 'px-[1.2rem] lg:px-[2.4rem] py-[2.4rem] lg:py-[3rem]'
    ]"
  >
    <div 
      :class="[
        'w-full mx-auto',
        !fluid && 'max-w-[150.6rem]'
      ]"
    >
      <slot />
    </div>
  </div>
</template>
