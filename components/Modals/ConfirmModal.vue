<template>
  <vue-final-modal name="ConfirmModal" v-slot="{ params, close }">
    <div
      class="w-[30rem] overflow-auto my-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <!-- Modal content -->
      <div class="bg-white rounded-lg shadow overflow-y-auto p-4 pb-6">
        <!-- Modal header -->
        <div class="flex justify-between items-center rounded-t">
          <h3 class="text-xl font-semibold text-custom-black">
            {{ params?.modalTitle }}
          </h3>
          <button
            type="button"
            class="text-custom-black bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            @click="close"
          >
            <span class="material-icons-outlined md-18 ml-auto"> close </span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="flex flex-col justify-end gap-5 mt-5">
          <div>
            <p class="text-xl">
              {{ params.prompt ?? "Are you sure ?" }}
            </p>
          </div>
          <div class="flex justify-between gap-5 mt-5">
            <button
              type="button"
              class="py-5 px-10 text-xl font-semibold text-blue-navy focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-royal focus:z-10 focus:ring-4 focus:ring-gray-200"
              @click.stop="close"
            >
              Cancel
            </button>
            <button
              class="text-white bg-blue-royal hover:bg-blue-navy focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-xl py-5 px-10 focus:outline-none"
              @click="confirm(close)"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  </vue-final-modal>
</template>

<script setup>
const emit = defineEmits(["confirm"]);

function confirm(close) {
  emit("confirm", close);
}
</script>
