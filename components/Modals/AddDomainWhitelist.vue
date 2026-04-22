<script setup>
import {defineProps, ref, watch, defineEmits} from 'vue'
import {VueFinalModal} from "vue-final-modal";
import {useToastStore} from "~/stores/toast.store.js";

const configStore = useConfigStore()
const toastStore = useToastStore()
const emit = defineEmits(['addToDomainList', 'close']);

const props = defineProps({
  title: {
    type: String,
    default: 'Add Domain(s)',
  },
  modalType: {
    type: String,
    required: false,
    default: 'test'
  },
  domainList: {
    type: Array,
    default: () => [],
  }, // use v-model:domains in parent
});

const localDomains = ref([]);
const isSubmitting = ref(false);

function CancelForm(close = null) {

  if (close && close instanceof Function) {
    close();
    emit('close');
  }
}

async function saveDomains(close) {
  isSubmitting.value = true;
  localDomains.value = localDomains.value.filter(domain => domain !== '');
  await configStore.updateDomains({mode: props.modalType, domains: localDomains.value});
  isSubmitting.value = false;
  toastStore.success("Domain(s) saved successfully")
  CancelForm(close);

}

watch(localDomains, (_) => {
  // console.log(newVal);
  // emit('addToDomainList', newVal);
  if (localDomains.value.length === 0) {
    localDomains.value.push('');
  }
}, {deep: true});
onMounted(() => {
  localDomains.value = [...props.domainList];
  if (localDomains.value.length === 0) {
    localDomains.value.push('');
  }
});
</script>

<template>
  <vue-final-modal
      v-slot="{ close }"
      modal-id="addDomainWhitelistModal"
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
        <!-- domain input -->
        <div class="flex flex-col gap-y-[1.6rem] text-[1.6rem] font-[400] px-[40px] pb-[40px]">
          <h3 class="font-[600] text-[1.8rem] text-center">{{ title }}</h3>
          <p class="text-[#666666]">Add the domains that will be authorized to use the secret key.</p>
          <div>
            <label class="text-[#1B1B19]">Domain</label>
            <div class="flex flex-col">
              <div class="gap-y-[4px] flex flex-col">
                <div v-for="(domain, index) in localDomains" :key="index" class="flex items-center gap-x-[4px]">
                  <input
                      :value="localDomains[index]"
                      type="text"
                      placeholder="Enter domain e.g example.com"
                      class="outline-none w-full h-[47px] text-[#616161] border border-[#E0E0E0] text-[1.6rem] rounded-[10px] py-[12px] px-[16px]"
                      :class="{ 'bg-[#FBFBFB] text-[#616161]': localDomains[index] }"
                      @input="e => localDomains[index] = e?.target?.value || ''"
                  />
                  <div
                      v-if="!(localDomains.length === 1 && !localDomains[0])"
                      class="cursor-pointer rounded-[10px] w-[47px] h-[47px] border border-[#E0E0E0] flex items-center justify-center"
                      @click="localDomains.splice(index, 1)"
                  >
                    <img src="/icons/trash.svg" alt="remove" class="w-[24px] h-[24px]"/>
                  </div>
                </div>
              </div>

              <button
                  class="w-full rounded-[10px] bg-[#fff] text-[#003366] font-[700] cursor-pointer mt-[24px] text-left pl-[10px]"
                  @click="localDomains.push('')"
              >
                Add another domain
              </button>
              <button
                  class="w-full h-[47px] rounded-[10px] bg-[#003366] text-[#fff] font-[700] cursor-pointer mt-[24px]"
                  :class="[{ 'disabled-button': isSubmitting }]"
                  :disabled="isSubmitting"
                  @click="saveDomains(close)"
              >

                <span v-if="isSubmitting">
                Saving<span class="dot">.</span><span class="dot delay-200">.</span><span
                    class="dot delay-400">.</span>
            </span>
                <span v-else>Save Domain(s)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </vue-final-modal>
</template>

<style scoped>

</style>