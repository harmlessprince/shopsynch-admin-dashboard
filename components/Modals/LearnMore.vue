<script setup>

import {VueFinalModal} from "vue-final-modal";

function CancelForm(close = null) {

  if (close && close instanceof Function) {
    close();
  }
}
</script>

<template>
  <vue-final-modal
      v-slot="{ close }"
      modal-id="learnMoreModal"
      :lock-scroll="false"
      @click-outside="CancelForm( close )"
  >
    <div
        class="w-[460px]  min-h-[450px] overflow-auto my-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-99999999"
    >
      <!-- Modal content -->
      <div class="bg-white rounded-[10px] shadow overflow-y-auto">
        <!-- Modal header -->
        <!-- Modal header -->
        <div class="flex justify-between items-center h-[72px] w-[460px] pr-[24px] py-[24px]">
          <button
              type="button"
              class=" rounded-lg text-sm p-1.5 ml-auto inline-flex items-center cursor-pointer"
              @click="CancelForm(close)"
          >
            <span class="material-symbols-outlined md-18 ml-auto text-[24px]"> cancel </span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="flex flex-col gap-y-[1.6rem] text-[1.6rem] font-[400] px-[40px] pb-[40px]">
          <h1 class="font-[600] text-[1.8rem] text-center">Domain whitelist</h1>
          <p>
            Add specific domains that are authorized to access your API keys or services. Only the domains listed here will be allowed to use your keys, adding an extra layer of security and preventing unauthorized usage.
          </p>
          <button
              class="w-full h-[47px] rounded-[10px] bg-[#003366] text-[#fff] font-[700] cursor-pointer"
              @click="CancelForm(close)"
          >
            Okay
          </button>
        </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>