<script setup lang="ts">

import {VueFinalModal} from "vue-final-modal";

const switchMode = useSwitchModeStore()

function CancelForm(close = null) {

  if (close && close instanceof Function) {
    close();
  }
}
</script>

<template>
  <vue-final-modal
      v-slot="{ close }"
      modal-id="profileCompletionModal"
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
          <h1 class="font-[600] text-[1.8rem] text-center">You’re All Set! 🚀</h1>
          <p>
            Your API keys are ready. Continue in <b>Test Mode</b> to experiment without risk, or go straight to <b>Live
            Mode</b> to take your store live!
          </p>
          <div class="flex justify-between gap-x-[1.6rem]">
            <button
                class="w-full h-[47px] rounded-[10px] border-solid border-[#003366] border-1 text-[#003366] font-[700] cursor-pointer"
                @click="CancelForm(close)"
            >
              Okay
            </button>
            <button
                class="w-full h-[47px] rounded-[10px] bg-[#003366] text-[#fff] font-[700] cursor-pointer"
                @click="switchMode.updateCurrentMode('live')"
            >
              Use Live Mode
            </button>
          </div>

        </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>