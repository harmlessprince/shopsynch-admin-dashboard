<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">Inventory Management</h3>
      <button
        @click="activeTab = 'all'"
        class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
      >
        View All
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex space-x-2 border-b">
      <button
        @click="activeTab = 'all'"
        :class="activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'"
        class="px-4 py-2 font-medium transition"
      >
        All Inventory
      </button>
      <button
        @click="activeTab = 'lowStock'"
        :class="activeTab === 'lowStock' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'"
        class="px-4 py-2 font-medium transition"
      >
        Low Stock
        <span v-if="inventoryStore.lowStockItems.length" class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
          {{ inventoryStore.lowStockItems.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'logs'"
        :class="activeTab === 'logs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'"
        class="px-4 py-2 font-medium transition"
      >
        Audit Logs
      </button>
    </div>

    <!-- All Inventory Tab -->
    <div v-if="activeTab === 'all'" class="space-y-4">
      <div v-if="inventoryStore.inventory.length" class="space-y-3">
        <div
          v-for="item in inventoryStore.inventory"
          :key="item.id"
          class="p-4 border rounded-lg bg-white hover:shadow-md transition"
        >
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-semibold">{{ item.warehouseName }}</h4>
              <p class="text-sm text-gray-600">Product ID: {{ item.productId }}</p>
              <p v-if="item.location" class="text-sm text-gray-600">Location: {{ item.location }}</p>
            </div>
            <button
              @click="openAdjustmentForm(item)"
              class="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
            >
              Adjust
            </button>
          </div>

          <!-- Stock Levels -->
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div class="p-3 bg-blue-50 rounded">
              <p class="text-gray-600">On Hand</p>
              <p class="text-lg font-semibold text-blue-600">{{ item.onHandQty }}</p>
            </div>
            <div class="p-3 bg-yellow-50 rounded">
              <p class="text-gray-600">Reserved</p>
              <p class="text-lg font-semibold text-yellow-600">{{ item.reservedQty }}</p>
            </div>
            <div class="p-3 bg-green-50 rounded">
              <p class="text-gray-600">Available</p>
              <p class="text-lg font-semibold text-green-600">{{ item.availableQty }}</p>
            </div>
          </div>

          <!-- Reorder Info -->
          <div v-if="item.reorderLevel" class="mt-3 p-2 bg-gray-50 rounded text-sm">
            <p class="text-gray-600">
              Reorder Level: <span class="font-semibold">{{ item.reorderLevel }}</span> | 
              Reorder Qty: <span class="font-semibold">{{ item.reorderQty }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
        <p class="text-gray-600">No inventory records found.</p>
      </div>
    </div>

    <!-- Low Stock Tab -->
    <div v-if="activeTab === 'lowStock'" class="space-y-4">
      <div v-if="inventoryStore.lowStockItems.length" class="space-y-3">
        <div
          v-for="item in inventoryStore.lowStockItems"
          :key="item.id"
          class="p-4 border border-red-200 rounded-lg bg-red-50"
        >
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-semibold text-red-800">{{ item.warehouseName }}</h4>
              <p class="text-sm text-red-700">
                Current: <span class="font-semibold">{{ item.onHandQty }}</span> | 
                Threshold: <span class="font-semibold">{{ item.reorderLevel }}</span> | 
                Reorder: <span class="font-semibold">{{ item.reorderQty }}</span>
              </p>
            </div>
            <button
              @click="openAdjustmentForm(item)"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              Reorder
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 bg-green-50 rounded-lg">
        <p class="text-green-600">✓ All items are above reorder level!</p>
      </div>
    </div>

    <!-- Audit Logs Tab -->
    <div v-if="activeTab === 'logs'" class="space-y-4">
      <div v-if="inventoryStore.inventoryLogs.length" class="space-y-2">
        <div
          v-for="log in inventoryStore.inventoryLogs"
          :key="log.id"
          class="p-3 border rounded-lg bg-white text-sm"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="font-semibold">{{ log.action }}</p>
              <p class="text-gray-600">Qty: {{ log.qty > 0 ? '+' : '' }}{{ log.qty }}</p>
              <p v-if="log.reference" class="text-gray-600">Reference: {{ log.reference }}</p>
              <p v-if="log.notes" class="text-gray-600">Notes: {{ log.notes }}</p>
            </div>
            <p class="text-gray-500 text-xs whitespace-nowrap ml-2">
              {{ formatDate(log.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
        <p class="text-gray-600">No audit logs available.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="inventoryStore.loading" class="text-center py-4">
      <p class="text-gray-600">Loading inventory...</p>
    </div>

    <!-- Error State -->
    <div v-if="inventoryStore.error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-800">Error: {{ inventoryStore.error }}</p>
    </div>

    <!-- Adjustment Modal -->
    <div
      v-if="showAdjustmentForm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <h4 class="text-lg font-semibold">Adjust Stock</h4>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Action Type *</label>
            <select
              v-model="adjustmentForm.action"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select action...</option>
              <option value="RECEIVED">Received</option>
              <option value="SOLD">Sold</option>
              <option value="ADJUSTED">Adjusted</option>
              <option value="RESERVED">Reserved</option>
              <option value="RELEASED">Released</option>
              <option value="DAMAGED">Damaged</option>
              <option value="RETURNED">Returned</option>
              <option value="TRANSFERRED_IN">Transferred In</option>
              <option value="TRANSFERRED_OUT">Transferred Out</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Quantity *</label>
            <input
              v-model.number="adjustmentForm.qty"
              type="number"
              placeholder="e.g., 10 or -5"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Reference (optional)</label>
            <input
              v-model="adjustmentForm.reference"
              type="text"
              placeholder="e.g., PO-123 or ORD-456"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              v-model="adjustmentForm.notes"
              placeholder="Add any notes about this adjustment"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-4">
          <button
            @click="handleAdjustment"
            :disabled="isAdjusting"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ isAdjusting ? 'Saving...' : 'Save Adjustment' }}
          </button>
          <button
            @click="closeAdjustmentForm"
            :disabled="isAdjusting"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useInventoryStore } from '~/stores/inventory.store';
import { useToastStore } from '~/stores/toast.store';
import { inventoryAdjustmentSchema } from '~/schemas/inventory.schema';

const inventoryStore = useInventoryStore();
const toastStore = useToastStore();

const activeTab = ref('all');
const showAdjustmentForm = ref(false);
const isAdjusting = ref(false);
const currentInventoryId = ref(null);

const adjustmentForm = reactive({
  inventoryId: '',
  qty: 0,
  action: '',
  reference: '',
  notes: '',
});

const resetAdjustmentForm = () => {
  adjustmentForm.inventoryId = '';
  adjustmentForm.qty = 0;
  adjustmentForm.action = '';
  adjustmentForm.reference = '';
  adjustmentForm.notes = '';
  currentInventoryId.value = null;
};

const closeAdjustmentForm = () => {
  showAdjustmentForm.value = false;
  resetAdjustmentForm();
};

const openAdjustmentForm = (item) => {
  currentInventoryId.value = item.id;
  showAdjustmentForm.value = true;
};

const handleAdjustment = async () => {
  try {
    isAdjusting.value = true;

    // Validate form
    const validation = inventoryAdjustmentSchema.safeParse({
      qty: adjustmentForm.qty,
      action: adjustmentForm.action,
      reference: adjustmentForm.reference,
      notes: adjustmentForm.notes,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      toastStore.showErrorToast(errors.join(', '));
      return;
    }

    await inventoryStore.adjustStock(currentInventoryId.value, {
      qty: adjustmentForm.qty,
      action: adjustmentForm.action,
      reference: adjustmentForm.reference,
      notes: adjustmentForm.notes,
    });

    toastStore.showSuccessToast('Stock adjusted successfully');
    closeAdjustmentForm();

    // Refresh data
    await inventoryStore.getInventory();
    if (activeTab.value === 'lowStock') {
      await inventoryStore.getLowStockItems();
    }
  } catch (err) {
    toastStore.showErrorToast(err.message || 'Failed to adjust stock');
    console.error('Error:', err);
  } finally {
    isAdjusting.value = false;
  }
};

const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
};

// Load data on mount
onMounted(async () => {
  try {
    await inventoryStore.getInventory();
    await inventoryStore.getLowStockItems();
    await inventoryStore.getInventoryLogs();
  } catch (err) {
    toastStore.showErrorToast('Failed to load inventory');
    console.error('Error:', err);
  }
});
</script>
