<script setup>

import {VueFinalModal} from "vue-final-modal";
import {ref} from 'vue'

const switchMode = useSwitchModeStore()
const isLiveCheckboxChecked = ref(false)

function handleCheckboxChange() {
  sessionStorage.setItem('dontShowLiveNoticeMessage', isLiveCheckboxChecked.value);
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
      modal-id="liveModeNoticeModal"
      :lock-scroll="false"
      @click-outside="CancelForm( close )"
  >
    <div
        class="w-[460px]  min-h-[450px] overflow-auto my-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-99999999"
    >
      <!-- Modal content -->
      <div class="bg-white rounded-[10px] shadow overflow-y-auto">
        <!-- Modal header -->
        <div class="flex justify-between items-center h-[72px] w-full pr-[24px] py-[24px]">
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
          <h1 class="font-[600] text-[1.8rem] text-[#000] text-center">Live mode notice!</h1>
          <div class="flex flex-col gap-y-[2.4rem] text-[#616161]">
            <p>
              You are viewing your dashboard in live mode. All the data you are seeing in this mode is
              <strong>REAL.</strong>
            </p>
            <div class="flex gap-x-[12px]">
              <input
                  v-model="isLiveCheckboxChecked"
                  name="test"
                  type="checkbox"
                  class="border border-[#616161] w-[20px] h-[20px] cursor-pointer"
                  @change="handleCheckboxChange(switchMode.currentMode)"
              >
              <span>Don’t show this message again</span>
            </div>
            <button
                class="w-full h-[47px] rounded-[10px] bg-[#003366] text-[#fff] font-[700] cursor-pointer"
                @click="CancelForm(close)"
            >
              Okay, I understand
            </button>
          </div>

        </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>