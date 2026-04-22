import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'
import { useAuthStore } from './auth.store.js'

export const useAppSettingsStore = defineStore('appSettings', () => {
  const { get, patch, delete: deleteRequest } = useApiService()
  const authStore = useAuthStore()

  const settings = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch all tenant settings for a specific category
  const fetchSettings = async (category = null) => {
    loading.value = true
    error.value = null
    
    try {
      const tenantId = authStore.user?.tenantId
      if (!tenantId) {
        error.value = 'Tenant ID not found'
        return
      }

      const url = category
        ? `${endpoints.appSettings.list(tenantId)}?category=${category}`
        : endpoints.appSettings.list(tenantId)

      const response = await get(url, {})
      
      if (response?.status) {
        settings.value = response.data ?? []
      }
      return response
    } catch (e) {
      error.value = e?.message || 'Failed to fetch settings'
    } finally {
      loading.value = false
    }
  }

  // Update a single setting value for the tenant
  const updateSettingValue = async (key, value) => {
    try {
      const tenantId = authStore.user?.tenantId
      if (!tenantId) {
        throw new Error('Tenant ID not found')
      }

      const response = await patch(
        endpoints.appSettings.updateValue(tenantId, key),
        { value },
      )

      if (response?.status) {
        // Update local state so UI reflects the change immediately
        const idx = settings.value.findIndex(s => s.key === key)
        if (idx !== -1) {
          settings.value[idx] = response.data
        }
      }
      return response
    } catch (e) {
      error.value = e?.message || 'Failed to update setting'
      throw e
    }
  }

  // Delete a setting override (reverts to global default)
  const deleteSettingOverride = async (key) => {
    try {
      const tenantId = authStore.user?.tenantId
      if (!tenantId) {
        throw new Error('Tenant ID not found')
      }

      const response = await deleteRequest(
        endpoints.appSettings.deleteOverride(tenantId, key),
        {},
        { forceMode: 'live' }
      )

      if (response?.status) {
        // Remove from local settings
        settings.value = settings.value.filter(s => s.key !== key)
      }
      return response
    } catch (e) {
      error.value = e?.message || 'Failed to delete setting override'
      throw e
    }
  }

  // Find a setting by key from loaded state
  const getSetting = (key) => {
    return settings.value.find(s => s.key === key)
  }

  // Get all settings for a specific category
  const getSettingsByCategory = (category) => {
    return settings.value.filter(s => s.category === category)
  }

  // Get editable settings only
  const editableSettings = computed(() => {
    return settings.value.filter(s => s.editable)
  })

  // Get read-only settings only
  const readOnlySettings = computed(() => {
    return settings.value.filter(s => !s.editable)
  })

  // Clear all settings
  const clearSettings = () => {
    settings.value = []
    error.value = null
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettingValue,
    deleteSettingOverride,
    getSetting,
    getSettingsByCategory,
    editableSettings,
    readOnlySettings,
    clearSettings,
  }
})
