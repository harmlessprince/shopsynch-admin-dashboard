<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">Warehouses</h3>
      <button
        @click="showAddWarehouse = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Add Warehouse
      </button>
    </div>

    <!-- Warehouse List -->
    <div v-if="warehouseStore.warehouses.length" class="space-y-2">
      <div
        v-for="warehouse in warehouseStore.warehouses"
        :key="warehouse.id"
        class="p-4 border rounded-lg bg-white hover:shadow-md transition"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-semibold text-lg">
              {{ warehouse.name }}
              <span v-if="warehouse.default" class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Default
              </span>
              <span v-if="!warehouse.active" class="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                Inactive
              </span>
            </h4>
            <p class="text-sm text-gray-600">Code: {{ warehouse.code }}</p>
            <p class="text-sm text-gray-600">Address: {{ warehouse.address }}</p>
            <p class="text-sm text-gray-600">Type: {{ warehouse.type || 'OWNED' }}</p>
          </div>
          <button
            @click="editWarehouse(warehouse)"
            class="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
          >
            Edit
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
      <p class="text-gray-600">No warehouses created yet. Create your first warehouse to get started.</p>
    </div>

    <!-- Loading State -->
    <div v-if="warehouseStore.loading" class="text-center py-4">
      <p class="text-gray-600">Loading warehouses...</p>
    </div>

    <!-- Error State -->
    <div v-if="warehouseStore.error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-800">Error: {{ warehouseStore.error }}</p>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showAddWarehouse"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <h4 class="text-lg font-semibold">
          {{ isEditing ? 'Edit Warehouse' : 'Add New Warehouse' }}
        </h4>

        <!-- Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., Main Warehouse"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Code *</label>
            <input
              v-model="form.code"
              type="text"
              placeholder="e.g., WH-01"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Address *</label>
            <input
              v-model="form.address"
              type="text"
              placeholder="e.g., 123 Main St, City"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Type</label>
            <select
              v-model="form.type"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OWNED">Owned</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="CONSIGNMENT">Consignment</option>
              <option value="THIRD_PARTY_LOGISTICS">Third Party Logistics</option>
            </select>
          </div>

          <div class="flex items-center space-x-4">
            <label class="flex items-center">
              <input
                v-model="form.active"
                type="checkbox"
                class="rounded border-gray-300"
              />
              <span class="ml-2 text-sm">Active</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-4">
          <button
            @click="handleSubmit"
            :disabled="isSubmitting"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
          <button
            @click="closeModal"
            :disabled="isSubmitting"
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
import { useWarehouseStore } from '~/stores/warehouse.store';
import { useToastStore } from '~/stores/toast.store';
import { warehouseSchema } from '~/schemas/warehouse.schema';

const warehouseStore = useWarehouseStore();
const toastStore = useToastStore();

const showAddWarehouse = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const currentWarehouseId = ref(null);

const form = reactive({
  name: '',
  code: '',
  address: '',
  type: 'OWNED',
  active: true,
});

const resetForm = () => {
  form.name = '';
  form.code = '';
  form.address = '';
  form.type = 'OWNED';
  form.active = true;
  currentWarehouseId.value = null;
};

const closeModal = () => {
  showAddWarehouse.value = false;
  isEditing.value = false;
  resetForm();
};

const editWarehouse = (warehouse) => {
  isEditing.value = true;
  currentWarehouseId.value = warehouse.id;
  form.name = warehouse.name;
  form.code = warehouse.code;
  form.address = warehouse.address;
  form.type = warehouse.type || 'OWNED';
  form.active = warehouse.active !== false;
  showAddWarehouse.value = true;
};

const handleSubmit = async () => {
  try {
    isSubmitting.value = true;
    
    // Validate form
    const validation = warehouseSchema.safeParse(form);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      toastStore.showErrorToast(errors.join(', '));
      return;
    }

    if (isEditing.value) {
      await warehouseStore.updateWarehouse(currentWarehouseId.value, form);
      toastStore.showSuccessToast('Warehouse updated successfully');
    } else {
      await warehouseStore.createWarehouse(form);
      toastStore.showSuccessToast('Warehouse created successfully');
    }

    closeModal();
  } catch (err) {
    toastStore.showErrorToast(err.message || 'Failed to save warehouse');
    console.error('Error:', err);
  } finally {
    isSubmitting.value = false;
  }
};

// Load warehouses on mount
onMounted(async () => {
  try {
    await warehouseStore.getWarehouses();
  } catch (err) {
    toastStore.showErrorToast('Failed to load warehouses');
    console.error('Error:', err);
  }
});
</script>
