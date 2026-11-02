<script setup>
const props = defineProps({
  fileId: { type: String, default: "" },
  onFile: { type: Boolean, default: false },
  label: { type: String, required: true },
});

const { loadCredentialDocument, releaseCredentialDocument } = useCredentialDocument();

const loading = ref(false);
const errorMessage = ref("");
const objectUrl = ref("");
const isImage = ref(false);
const isOpen = ref(false);

async function openDocument() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const document = await loadCredentialDocument(props.fileId);
    close();
    objectUrl.value = document.objectUrl;
    isImage.value = document.contentType.startsWith("image/");
    isOpen.value = true;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function close() {
  isOpen.value = false;
  releaseCredentialDocument(objectUrl.value);
  objectUrl.value = "";
}

onBeforeUnmount(close);
</script>

<template>
  <div>
    <button
      v-if="fileId"
      type="button"
      :disabled="loading"
      class="inline-flex items-center gap-[0.4rem] font-[600] text-primary underline hover:no-underline disabled:opacity-50"
      @click="openDocument"
    >
      <span :class="['material-symbols-outlined text-[1.6rem]', { 'animate-spin': loading }]">
        {{ loading ? "progress_activity" : "visibility" }}
      </span>
      View {{ label }}
    </button>
    <p v-else-if="onFile" class="text-[1.2rem] text-slate-500">
      On file from before documents were stored privately. Ask the merchant to upload it again to view it.
    </p>
    <p v-else class="italic text-slate-400">Not uploaded</p>
    <p v-if="errorMessage" class="mt-[0.4rem] text-[1.2rem] text-red-600">{{ errorMessage }}</p>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex flex-col bg-black"
        @keydown.esc="close"
      >
        <div class="flex flex-shrink-0 items-center justify-between bg-black/80 px-[2rem] py-[1.2rem]">
          <p class="text-[1.6rem] font-[700] text-white">{{ label }}</p>
          <button
            type="button"
            class="flex items-center gap-[0.4rem] rounded-[6px] px-[1.2rem] py-[0.6rem] text-[1.4rem] font-[600] text-white transition-colors hover:bg-white/20"
            @click="close"
          >
            <span class="material-symbols-outlined text-[2rem]">close</span>
            Close
          </button>
        </div>
        <div class="flex flex-1 items-center justify-center overflow-auto">
          <img v-if="isImage" :src="objectUrl" class="max-h-full max-w-full object-contain" :alt="label">
          <iframe v-else :src="objectUrl" class="h-full w-full border-0 bg-white" :title="label" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
