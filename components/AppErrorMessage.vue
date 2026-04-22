<script setup lang="ts">
import {ErrorMessage} from "vee-validate";

defineProps({
  name: {
    type: String,
    required: true
  },
});
</script>

<template>
  <ErrorMessage :name="name" as="span"/>
</template>

<style scoped>

</style>