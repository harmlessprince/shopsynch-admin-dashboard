<script setup>
import {useForm} from 'vee-validate'

const props = defineProps({
  label: {
    type: String,
    default: 'Submit'
  },
  submittingLabel: {
    type: String,
    default: 'Submitting'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

</script>

<template>

  <button
      class="cursor-pointer w-full rounded-[10px] bg-[#003366] h-[47px] text-[1.6rem] text-[#fff] font-bold leading-[22.5px]"
      type="submit"
      :class="{ 'disabled-button': props.disabled || props.isSubmitting }"
      :disabled="props.disabled || props.isSubmitting"
  >
    <span v-if="props.isSubmitting">
      {{ submittingLabel }}<span class="dot">.</span><span class="dot delay-200">.</span><span class="dot delay-400">.</span>
    </span>
    <span v-else>{{ label }}</span>
  </button>
</template>

<style scoped>

</style>

<!--<SubmitButton-->
<!--    label="Register"-->
<!--    submitting-label="Registering"-->
<!--    :required-fields="['email', 'password']"-->
<!--/>-->