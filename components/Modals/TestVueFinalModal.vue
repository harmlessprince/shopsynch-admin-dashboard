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
      modal-id="testVueFinalModal"
      :lock-scroll="false"
      @click-outside="CancelForm( close )"
  >
    <div
        class="w-5/12 h-[80vh] overflow-auto my-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-99999999"
    >
      <!-- Modal content -->
      <div class="bg-white rounded-lg shadow overflow-y-auto pb-6">
        <!-- Modal header -->
        <div class="flex justify-between items-center p-4 rounded-t">
          <h3 class="text-xl font-semibold text-custom-black">
            Modal Title
          </h3>
          <button
              type="button"
              class="text-custom-black bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
              @click="CancelForm(close)"
          >
            <span class="material-icons-outlined md-18 ml-auto"> close </span>
          </button>
        </div>
        <!-- Modal body -->
        <div>
          Modal body
        </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>