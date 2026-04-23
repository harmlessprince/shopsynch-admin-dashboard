<script setup>
import Drawer from "~/components/Drawer.vue";
import { formatToMoney } from "~/utils/helpers.js";

const props = defineProps({
  open: { type: Boolean, required: true },
  adjustment: { type: Object, default: null },
});

const emit = defineEmits(["update:open", "resolved"]);

const logisticsStore = useAdminLogisticsStore();
const authStore = useAuthStore();

const resolutionAction = ref("");
const resolutionNote = ref("");
const resolvedBy = ref("");
const productWeightCorrections = ref([]);

const resolutionActions = [
  { value: "ACCEPT_CHARGE", label: "Accept Charge" },
  { value: "DISPUTE_PROVIDER_WEIGHT", label: "Dispute Provider Weight" },
  { value: "UPDATE_PRODUCT_WEIGHT", label: "Correct Product Weight" },
  { value: "WAIVE", label: "Waive" },
];

const adjustmentStatusBadge = {
  UNDER_REVIEW: "bg-[#FFF9C5] text-[#E79640]",
  MERCHANT_UNDERCHARGED: "bg-[#FFBFBF] text-[#FF3131]",
  MERCHANT_OVERCHARGED: "bg-[#FFE8CC] text-[#CC6600]",
  DISPUTED: "bg-[#FFE8CC] text-[#CC6600]",
  RESOLVED: "bg-[#B5F9B4] text-[#3CA745]",
  WAIVED: "bg-[#E5E7EB] text-[#6B7280]",
};

const diffClass = (val) =>
  val > 0 ? "text-[#FF3131] font-[600]" : val < 0 ? "text-[#3CA745] font-[600]" : "text-gray-500";

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resolutionAction.value = "";
      resolutionNote.value = "";
      resolvedBy.value = authStore.user?.id || authStore.user?.userId || "";
      productWeightCorrections.value = [];
    }
  },
);

function addProductRow() {
  productWeightCorrections.value.push({ productId: "", correctedWeightKg: null });
}

function removeProductRow(index) {
  productWeightCorrections.value.splice(index, 1);
}

async function handleResolve() {
  if (!resolutionAction.value) return;

  const payload = {
    resolutionAction: resolutionAction.value,
    resolutionNote: resolutionNote.value || undefined,
    resolvedBy: resolvedBy.value || undefined,
  };

  if (resolutionAction.value === "UPDATE_PRODUCT_WEIGHT") {
    payload.productWeightCorrections = productWeightCorrections.value.filter(
      (r) => r.productId && r.correctedWeightKg
    );
  }

  await logisticsStore.resolveWeightAdjustment(props.adjustment.id, payload);
  emit("resolved");
  emit("update:open", false);
}
</script>

<template>
  <Drawer :open="open" side="right" content-class="p-0" @update:open="$emit('update:open', $event)">
    <div class="flex h-full flex-col text-[1.4rem] text-dashboard_text_color">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 px-[2rem] py-[1.6rem]">
        <div>
          <h2 class="text-[1.8rem] font-[700] text-[#000]">Resolve Adjustment</h2>
          <p class="mt-[0.2rem] text-[1.2rem]">Order {{ adjustment?.orderNumber || "—" }}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-700" @click="$emit('update:open', false)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-[2rem] py-[1.6rem] space-y-[1.6rem]">
        <!-- Summary -->
        <div class="rounded-[8px] bg-slate-50 p-[1.4rem] space-y-[0.8rem]">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Tenant</span>
            <span class="font-[600] text-[#000]">{{ adjustment?.tenantId || "—" }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Provider</span>
            <span class="rounded-full bg-[#D0E8FF] px-[1rem] py-[0.2rem] text-[1.2rem] font-[600] text-[#0066CC]">
              {{ adjustment?.provider || "—" }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Status</span>
            <span
              :class="adjustmentStatusBadge[adjustment?.status] || 'bg-gray-100 text-gray-600'"
              class="rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[500]"
            >
              {{ adjustment?.status?.replace(/_/g, " ") || "—" }}
            </span>
          </div>
          <div v-if="adjustment?.reason" class="flex flex-col gap-[0.4rem]">
            <span class="text-gray-500">Reason</span>
            <span class="text-[1.2rem] text-[#000]">{{ adjustment.reason }}</span>
          </div>
        </div>

        <!-- Weight & fee comparison -->
        <div>
          <h3 class="mb-[1rem] font-[600] text-[#000]">Quoted vs Actual</h3>
          <div class="grid grid-cols-2 gap-[1rem]">
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Quoted Weight</p>
              <p class="text-[1.6rem] font-[700] text-[#000]">{{ adjustment?.quotedWeightKg ?? "—" }} kg</p>
            </div>
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Actual Weight</p>
              <p class="text-[1.6rem] font-[700] text-[#000]">{{ adjustment?.actualWeightKg ?? "—" }} kg</p>
            </div>
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Quoted Fee</p>
              <p class="text-[1.6rem] font-[700] text-[#000]">{{ formatToMoney(adjustment?.quotedFee || 0) }}</p>
            </div>
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Actual Fee</p>
              <p class="text-[1.6rem] font-[700] text-[#000]">{{ formatToMoney(adjustment?.actualFee || 0) }}</p>
            </div>
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Weight Diff</p>
              <p :class="diffClass(adjustment?.weightDifferenceKg)" class="text-[1.6rem]">
                {{ adjustment?.weightDifferenceKg != null ? adjustment.weightDifferenceKg + " kg" : "—" }}
              </p>
            </div>
            <div class="rounded-[8px] border border-slate-100 p-[1.2rem]">
              <p class="text-[1.2rem] text-gray-500">Fee Diff</p>
              <p :class="diffClass(adjustment?.feeDifference)" class="text-[1.6rem]">
                {{ adjustment?.feeDifference != null ? formatToMoney(adjustment.feeDifference) : "—" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Resolution form -->
        <div class="space-y-[1.2rem]">
          <h3 class="font-[600] text-[#000]">Resolution</h3>

          <div class="flex flex-col gap-[0.6rem]">
            <label class="text-[1.2rem] font-[500]">Action <span class="text-red-500">*</span></label>
            <select
              v-model="resolutionAction"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            >
              <option value="">Select action…</option>
              <option v-for="a in resolutionActions" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-[0.6rem]">
            <label class="text-[1.2rem] font-[500]">Resolution Note</label>
            <textarea
              v-model="resolutionNote"
              rows="3"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
              placeholder="Optional note…"
            />
          </div>

          <div class="flex flex-col gap-[0.6rem]">
            <label class="text-[1.2rem] font-[500]">Resolved By (admin ID)</label>
            <input
              v-model="resolvedBy"
              type="text"
              class="rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.9rem]"
            />
          </div>

          <!-- Product weight corrections (conditional) -->
          <div v-if="resolutionAction === 'UPDATE_PRODUCT_WEIGHT'" class="space-y-[1rem]">
            <div class="flex items-center justify-between">
              <h4 class="font-[600] text-[#000]">Product Weight Corrections</h4>
              <button
                class="flex items-center gap-[0.4rem] rounded-[8px] border border-primary px-[1rem] py-[0.5rem] text-primary hover:bg-blue-50"
                @click="addProductRow"
              >
                <span class="material-symbols-outlined text-[1.6rem]">add</span>
                Add product
              </button>
            </div>
            <div
              v-for="(row, index) in productWeightCorrections"
              :key="index"
              class="flex items-center gap-[1rem]"
            >
              <input
                v-model="row.productId"
                type="text"
                class="flex-1 rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem]"
                placeholder="Product ID"
              />
              <input
                v-model.number="row.correctedWeightKg"
                type="number"
                step="0.01"
                min="0"
                class="w-[120px] rounded-[8px] border border-slate-200 px-[1.2rem] py-[0.8rem]"
                placeholder="kg"
              />
              <button class="text-red-400 hover:text-red-600" @click="removeProductRow(index)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <p v-if="!productWeightCorrections.length" class="text-[1.2rem] text-gray-400">
              Add at least one product correction.
            </p>
          </div>
        </div>
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
          :disabled="!resolutionAction || logisticsStore.resolving"
          class="rounded-[8px] bg-primary px-[1.6rem] py-[0.9rem] font-[700] text-white disabled:opacity-50"
          @click="handleResolve"
        >
          {{ logisticsStore.resolving ? "Resolving…" : "Resolve" }}
        </button>
      </div>
    </div>
  </Drawer>
</template>
