<script setup>
import Drawer from "~/components/Drawer.vue";

const props = defineProps({
  open: { type: Boolean, required: true },
  capability: { type: Object, default: null },
});

const emit = defineEmits(["update:open", "saved"]);

const logisticsStore = useAdminLogisticsStore();

const COVERAGE_TYPES = [
  "WORLDWIDE",
  "AFRICA",
  "WEST_AFRICA",
  "EAST_AFRICA",
  "EUROPE",
  "NATIONWIDE",
  "SELECTED_STATES",
];

const form = ref(buildForm(null));
const showDeactivateConfirm = ref(false);
const countryInput = ref("");
const stateInput = ref("");
const internationalCountryInput = ref("");
const showMetadata = ref(false);
const metadataText = ref("");
const metadataError = ref("");

function buildForm(cap) {
  return {
    active: cap?.active ?? true,
    supportsMerchantPickup: cap?.supportsMerchantPickup ?? false,
    requiresDropOffLocation: cap?.requiresDropOffLocation ?? false,
    supportsDoorstepDelivery: cap?.supportsDoorstepDelivery ?? true,
    supportsInterstateDelivery: cap?.supportsInterstateDelivery ?? false,
    supportsInternationalDelivery: cap?.supportsInternationalDelivery ?? false,
    coverageType: cap?.coverageType ?? "NATIONWIDE",
    supportedCountries: [...(cap?.supportedCountries || [])],
    supportedStates: [...(cap?.supportedStates || [])],
    internationalCountries: [...(cap?.internationalCountries || [])],
    merchantInstructions: cap?.merchantInstructions ?? "",
  };
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.capability) {
      form.value = buildForm(props.capability);
      metadataText.value = props.capability.metadata
        ? JSON.stringify(props.capability.metadata, null, 2)
        : "";
      metadataError.value = "";
      showDeactivateConfirm.value = false;
      showMetadata.value = false;
      countryInput.value = "";
      stateInput.value = "";
      internationalCountryInput.value = "";
    }
  },
);

const needsCountries = computed(() => form.value.coverageType !== "WORLDWIDE");
const needsStates = computed(() => form.value.coverageType === "SELECTED_STATES");

function addTag(list, inputRef) {
  const val = inputRef.value.trim();
  if (val && !list.includes(val)) list.push(val);
  inputRef.value = "";
}

function removeTag(list, index) {
  list.splice(index, 1);
}

function handleActiveToggle() {
  if (form.value.active && props.capability?.active) {
    showDeactivateConfirm.value = true;
  } else {
    form.value.active = !form.value.active;
  }
}

function confirmDeactivate() {
  form.value.active = false;
  showDeactivateConfirm.value = false;
}

function parseMetadata() {
  if (!metadataText.value.trim()) return null;
  try {
    return JSON.parse(metadataText.value);
  } catch {
    metadataError.value = "Invalid JSON";
    return undefined;
  }
}

async function handleSave() {
  let metadata = null;
  if (metadataText.value.trim()) {
    metadata = parseMetadata();
    if (metadata === undefined) return;
  }

  const payload = {
    ...form.value,
    metadata: metadata ?? null,
  };

  if (!needsCountries.value) payload.supportedCountries = [];
  if (!needsStates.value) payload.supportedStates = [];
  if (!form.value.supportsInternationalDelivery) payload.internationalCountries = [];

  await logisticsStore.updateProviderCapability(props.capability.provider, payload);
  emit("saved");
}
</script>

<template>
  <Drawer :open="open" side="right" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex h-full flex-col text-[1.4rem] text-dashboard_text_color">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 px-[2rem] py-[1.6rem]">
        <div>
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Edit Provider Capability</h2>
          <p class="mt-[0.2rem] text-[1.2rem]">
            <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.2rem] font-[600] text-[#0066CC]">
              {{ capability?.provider }}
            </span>
          </p>
        </div>
        <button class="text-gray-400 hover:text-gray-700" @click="$emit('update:open', false)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Warning banner -->
      <div class="mx-[2rem] mt-[1.6rem] rounded-[8px] border border-amber-200 bg-amber-50 px-[1.4rem] py-[1rem] text-[1.2rem] text-amber-800">
        <span class="material-symbols-outlined mr-[0.4rem] align-middle text-[1.6rem]">warning</span>
        Changes affect merchant dashboard configuration and quote availability for all merchants.
      </div>

      <!-- Deactivate confirmation -->
      <div
        v-if="showDeactivateConfirm"
        class="mx-[2rem] mt-[1.2rem] rounded-[8px] border border-red-200 bg-red-50 px-[1.4rem] py-[1.2rem] text-[1.2rem] text-red-800"
      >
        <p class="font-[600]">Deactivate {{ capability?.provider }}?</p>
        <p class="mt-[0.4rem]">Merchants will no longer be able to use this provider and it will be skipped during quote generation.</p>
        <div class="mt-[1rem] flex gap-[1rem]">
          <button
            class="rounded-[6px] bg-red-600 px-[1.2rem] py-[0.6rem] font-[600] text-white hover:bg-red-700"
            @click="confirmDeactivate"
          >
            Deactivate
          </button>
          <button
            class="rounded-[6px] border border-slate-200 px-[1.2rem] py-[0.6rem] font-[600] hover:bg-slate-50"
            @click="showDeactivateConfirm = false"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-[2rem] py-[1.6rem] space-y-[2rem]">

        <!-- Availability -->
        <fieldset class="space-y-[1.2rem]">
          <legend class="text-[1.4rem] font-[700] text-[#000]">Availability</legend>
          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <span>Active</span>
            <button
              type="button"
              :class="form.active ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors"
              @click="handleActiveToggle"
            >
              <span
                :class="form.active ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>
        </fieldset>

        <!-- Handoff behavior -->
        <fieldset class="space-y-[1.2rem]">
          <legend class="text-[1.4rem] font-[700] text-[#000]">Merchant Handoff</legend>
          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <div>
              <p>Supports merchant pickup</p>
              <p class="text-[1.2rem] text-gray-500">Provider collects parcels from merchant's store</p>
            </div>
            <button
              type="button"
              :class="form.supportsMerchantPickup ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full transition-colors"
              @click="form.supportsMerchantPickup = !form.supportsMerchantPickup"
            >
              <span
                :class="form.supportsMerchantPickup ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>
          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <div>
              <p>Requires drop-off location</p>
              <p class="text-[1.2rem] text-gray-500">Merchant must drop parcels at a provider center</p>
            </div>
            <button
              type="button"
              :class="form.requiresDropOffLocation ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full transition-colors"
              @click="form.requiresDropOffLocation = !form.requiresDropOffLocation"
            >
              <span
                :class="form.requiresDropOffLocation ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>
        </fieldset>

        <!-- Delivery capabilities -->
        <fieldset class="space-y-[1.2rem]">
          <legend class="text-[1.4rem] font-[700] text-[#000]">Delivery Capabilities</legend>

          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <span>Doorstep delivery</span>
            <button
              type="button"
              :class="form.supportsDoorstepDelivery ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full transition-colors"
              @click="form.supportsDoorstepDelivery = !form.supportsDoorstepDelivery"
            >
              <span
                :class="form.supportsDoorstepDelivery ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>

          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <span>Interstate delivery</span>
            <button
              type="button"
              :class="form.supportsInterstateDelivery ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full transition-colors"
              @click="form.supportsInterstateDelivery = !form.supportsInterstateDelivery"
            >
              <span
                :class="form.supportsInterstateDelivery ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>

          <label class="flex cursor-pointer items-center justify-between rounded-[8px] border border-slate-100 p-[1.2rem] hover:bg-slate-50">
            <span>International delivery</span>
            <button
              type="button"
              :class="form.supportsInternationalDelivery ? 'bg-primary' : 'bg-slate-300'"
              class="relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full transition-colors"
              @click="form.supportsInternationalDelivery = !form.supportsInternationalDelivery"
            >
              <span
                :class="form.supportsInternationalDelivery ? 'translate-x-[22px]' : 'translate-x-[2px]'"
                class="inline-block h-[20px] w-[20px] transform rounded-full bg-white transition-transform shadow"
              />
            </button>
          </label>

          <!-- International countries tag input (conditional) -->
          <div v-if="form.supportsInternationalDelivery" class="space-y-[0.8rem]">
            <label class="text-[1.2rem] font-[500]">
              International countries <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap gap-[0.6rem]">
              <span
                v-for="(c, i) in form.internationalCountries"
                :key="c"
                class="flex items-center gap-[0.4rem] rounded-full bg-[#D0E8FF] px-[1rem] py-[0.3rem] text-[1.2rem] font-[500] text-[#0066CC]"
              >
                {{ c }}
                <button type="button" class="hover:text-red-500" @click="removeTag(form.internationalCountries, i)">
                  <span class="material-symbols-outlined text-[1.4rem]">close</span>
                </button>
              </span>
            </div>
            <div class="flex gap-[0.8rem]">
              <input
                v-model="internationalCountryInput"
                type="text"
                class="flex-1 rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.4rem]"
                placeholder="Country name, press Enter"
                @keyup.enter="addTag(form.internationalCountries, internationalCountryInput)"
              />
              <button
                type="button"
                class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] hover:bg-slate-50"
                @click="addTag(form.internationalCountries, internationalCountryInput)"
              >
                Add
              </button>
            </div>
          </div>
        </fieldset>

        <!-- Coverage -->
        <fieldset class="space-y-[1.2rem]">
          <legend class="text-[1.4rem] font-[700] text-[#000]">Coverage</legend>

          <div class="flex flex-col gap-[0.6rem]">
            <label class="text-[1.2rem] font-[500]">Coverage type <span class="text-red-500">*</span></label>
            <select
              v-model="form.coverageType"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] text-[1.4rem]"
            >
              <option v-for="ct in COVERAGE_TYPES" :key="ct" :value="ct">{{ ct.replace(/_/g, " ") }}</option>
            </select>
          </div>

          <!-- Supported countries -->
          <div v-if="needsCountries" class="space-y-[0.8rem]">
            <label class="text-[1.2rem] font-[500]">
              Supported countries <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap gap-[0.6rem]">
              <span
                v-for="(c, i) in form.supportedCountries"
                :key="c"
                class="flex items-center gap-[0.4rem] rounded-full bg-slate-100 px-[1rem] py-[0.3rem] text-[1.2rem] font-[500] text-slate-700"
              >
                {{ c }}
                <button type="button" class="hover:text-red-500" @click="removeTag(form.supportedCountries, i)">
                  <span class="material-symbols-outlined text-[1.4rem]">close</span>
                </button>
              </span>
            </div>
            <div class="flex gap-[0.8rem]">
              <input
                v-model="countryInput"
                type="text"
                class="flex-1 rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.4rem]"
                placeholder="Country name, press Enter"
                @keyup.enter="addTag(form.supportedCountries, countryInput)"
              />
              <button
                type="button"
                class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] hover:bg-slate-50"
                @click="addTag(form.supportedCountries, countryInput)"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Supported states -->
          <div v-if="needsStates" class="space-y-[0.8rem]">
            <label class="text-[1.2rem] font-[500]">
              Supported states <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap gap-[0.6rem]">
              <span
                v-for="(s, i) in form.supportedStates"
                :key="s"
                class="flex items-center gap-[0.4rem] rounded-full bg-slate-100 px-[1rem] py-[0.3rem] text-[1.2rem] font-[500] text-slate-700"
              >
                {{ s }}
                <button type="button" class="hover:text-red-500" @click="removeTag(form.supportedStates, i)">
                  <span class="material-symbols-outlined text-[1.4rem]">close</span>
                </button>
              </span>
            </div>
            <div class="flex gap-[0.8rem]">
              <input
                v-model="stateInput"
                type="text"
                class="flex-1 rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] text-[1.4rem]"
                placeholder="State name, press Enter"
                @keyup.enter="addTag(form.supportedStates, stateInput)"
              />
              <button
                type="button"
                class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem] hover:bg-slate-50"
                @click="addTag(form.supportedStates, stateInput)"
              >
                Add
              </button>
            </div>
          </div>
        </fieldset>

        <!-- Merchant instructions -->
        <fieldset class="space-y-[0.8rem]">
          <legend class="text-[1.4rem] font-[700] text-[#000]">Merchant Instructions</legend>
          <textarea
            v-model="form.merchantInstructions"
            rows="4"
            class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] text-[1.4rem]"
            placeholder="Instructions shown to merchants when they enable this provider…"
          />
        </fieldset>

        <!-- Advanced metadata -->
        <fieldset class="space-y-[0.8rem]">
          <button
            type="button"
            class="flex items-center gap-[0.6rem] text-[1.2rem] font-[500] text-gray-500 hover:text-gray-800"
            @click="showMetadata = !showMetadata"
          >
            <span class="material-symbols-outlined text-[1.6rem]">{{ showMetadata ? 'expand_less' : 'expand_more' }}</span>
            Advanced: Metadata JSON
          </button>
          <div v-if="showMetadata" class="space-y-[0.6rem]">
            <textarea
              v-model="metadataText"
              rows="6"
              class="w-full rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem] font-mono text-[1.2rem]"
              placeholder='{"key": "value"}'
              @input="metadataError = ''"
            />
            <p v-if="metadataError" class="text-[1.2rem] text-red-600">{{ metadataError }}</p>
          </div>
        </fieldset>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-[1rem] border-t border-slate-100 px-[2rem] py-[1.6rem]">
        <button
          class="rounded-[8px] border border-slate-200 px-[1.6rem] py-[0.9rem] font-[600] hover:bg-slate-50"
          @click="$emit('update:open', false)"
        >
          Cancel
        </button>
        <button
          :disabled="logisticsStore.capabilitySaving"
          class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
          @click="handleSave"
        >
          {{ logisticsStore.capabilitySaving ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </div>
  </Drawer>
</template>
