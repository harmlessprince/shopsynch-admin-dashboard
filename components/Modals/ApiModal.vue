<script setup>
import {VueFinalModal} from "vue-final-modal";
import { defineProps, defineEmits } from 'vue'
import { ref } from 'vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const inputFields = ref([{id:1}])
let idCounter = 1;

function addDomainInputField() {
    inputFields.value.push({
        id: idCounter++   
    })
}


function CancelForm(close = null) {

  if (close && close instanceof Function) {
    close();
  }
}
</script>

<template>
  <vue-final-modal
      v-slot="{ close }"
      modal-id="apiModal"
      :lock-scroll="false"
      @click-outside="CancelForm( close )"
  >
    <div
        class="w-[460px]  min-h-[450px] overflow-auto my-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-99999999"
    >
      <!-- Modal content -->
      <div class="bg-white rounded-[10px] shadow overflow-y-auto p-[40px]">
        <!-- Modal header -->
        <div class="flex justify-between items-center p-4 rounded-t">
          <button
              type="button"
              class=" rounded-lg text-sm p-1.5 ml-auto inline-flex items-center cursor-pointer"
              @click="CancelForm(close)"
          >
            <span class="material-symbols-outlined md-18 ml-auto text-[24px]"> cancel </span>
          </button>
        </div>
        <!-- Modal body -->
       <!-- domain input -->
       <div class="flex flex-col gap-y-[1.6rem] mt-[2.4rem] text-[1.6rem] font-[400]">
                    <h1 class="font-[600] text-[1.8rem] text-center">Add Domain(s)</h1>
                   <span class="text-[#666666]">Add the domains that will be authorized to use the secret key.</span>
                   <div v-for="(field, index) in inputFields" :key="index">
                    <label :for="`field-${field.id}`" class="text-[#1B1B19]">Domain</label>
                    <input
                    :id="`field-${field.id}`"
                    type="text" placeholder="Enter domain e.g example.com" 
                    class="w-full h-[47px] text-[#616161] border border-[#E0E0E0] text-[1.6rem] rounded-[10px] py-[12px] px-[16px]" />
                   </div>
                   <div
                   @click="addDomainInputField" 
                   class="flex items-center gap-x-[1.2rem] text-[#003366] max-w-[15rem] cursor-pointer"
                   >
                     <span class="material-symbols-outlined">add</span>
                     <span class="font-[700]">Add domain(s)</span>
                   </div> 
                    <button class="w-full h-[47px] rounded-[10px] bg-[#003366] text-[#fff] font-[700] cursor-pointer">Save Domain(s)</button>
                </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>