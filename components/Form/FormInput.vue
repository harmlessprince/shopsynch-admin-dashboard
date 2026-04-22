<script setup>
import {Field} from 'vee-validate';

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: '',
  },
  modelValue: {
    type: [String, Number],
    default: null,
    required: false,
  },
  name: {
    type: String,
    default: 'default',
  },
})
const innerValue = ref(props.modelValue);
const emit = defineEmits(["update:modelValue"]);
const updateValue = (event) => {
  emit("update:modelValue", event.target.value);
};
watch(() => props.modelValue, (val) => (innerValue.value = val));
watch(innerValue, (val) => emit("update:modelValue", val));

</script>

<template>
  <Field
      v-model="innerValue"
      :type='type'
      :placeholder='placeholder'
      class="w-full h-[47px] rounded-[10px] border border-[#E0E0E0] outline-none px-[1.6rem] font-[400] text-[14px] text-[#616161] placeholder-[#616161]"
      :name="name"
      :value="modelValue"
      @input="updateValue"
  />
</template>

<style scoped>

</style>