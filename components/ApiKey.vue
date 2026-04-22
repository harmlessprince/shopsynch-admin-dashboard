<script setup>
import {useToastStore} from "~/stores/toast.store.js";
const props  =defineProps({
  value: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});
const isHidden = ref(true)
const toastStore = useToastStore()
const toggleHidden = () => {
  isHidden.value = !isHidden.value
}

const inputType = computed(() => isHidden.value ? 'password' : 'text')

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(props.value)
    toastStore.success(`${props.title} copied to clipboard!`, "Copied")
  } catch (err) {
    toastStore.success(`${props.title} failed to copy to clipboard!`, "Not Copied")
  }
}
</script>

<template>
  <div class="w-full h-[58px] relative">
    <input
        :type="inputType"
        :value="value"
        readonly
        class="text-[#00000099] text-[1.6rem] bg-[#fff] w-full h-full outline-none py-[8px] pl-[16px] pr-[8px] rounded-[10px] border border-[#E0E0E0]"
    />
    <div class="flex items-center gap-x-[8px] absolute top-[8px] right-[8px] text-[#003366]" v-if="value">
      <button
          class="cursor-pointer bg-[#fff] h-[42px] w-[13.4rem] rounded-[10px] border border-[#00336633] outline-none flex justify-center items-center gap-x-[1rem]"
          @click="toggleHidden"
      >
        <span>{{ isHidden ? 'Show key' : 'Hide key' }}</span>
        <span class="material-symbols-outlined">
          {{ isHidden ? 'visibility' : 'visibility_off' }}
        </span>
      </button>
      <button
          class="cursor-pointer bg-[#EDEFF2] h-[42px] w-[13.8rem] rounded-[8px]  flex justify-center items-center gap-x-[1rem]"
          @click="copyKey"
      >
        <span>Copy Key</span>
        <span class="material-symbols-outlined">content_copy</span>
      </button>
    </div>
    <div v-else class="flex items-center gap-x-[8px] absolute top-[8px] right-[8px] text-[#003366]">
        Loading...
    </div>
  </div>
</template>

<style scoped>

</style>