import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApiService } from '~/services/apiService.js'
import { endpoints } from '~/utils/endpoints.js'

export const useProductTemplateStore = defineStore('productTemplateStore', () => {
  const { get, post, put, delete: deleteRequest } = useApiService()

  // State
  const templates = ref([])
  const templatesByCategory = ref({})
  const currentTemplate = ref(null)
  const isLoading = ref(false)

  /**
   * Fetch all product templates
   * @param {Object} params - Query parameters (categoryId, tenantId, systemOnly)
   */
  async function getTemplates(params = {}) {
    try {
      isLoading.value = true
      const response = await get(endpoints.productTemplates.list, params)
      if (response?.data) {
        templates.value = response.data
      }
      return response
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch template for a specific category
   * Resolves tenant override → system default automatically
   * @param {string} categoryId - The tenant category ID
   */
  async function getTemplateByCategory(categoryId) {
    try {
      isLoading.value = true
      const url = endpoints.productTemplates.byCategory.replace(':categoryId', categoryId)
      const response = await get(url, {}, { silent: true })
      
      if (response?.data) {
        templatesByCategory.value[categoryId] = response.data
        return response.data
      }
      
      // Return null if 404 (no template for this category)
      if (response?.status === false) {
        templatesByCategory.value[categoryId] = null
        return null
      }
    } catch (error) {
      console.warn(`No template found for category ${categoryId}`)
      templatesByCategory.value[categoryId] = null
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a single template by ID
   * @param {string} templateId
   */
  async function getTemplateById(templateId) {
    try {
      isLoading.value = true
      const url = endpoints.productTemplates.detail.replace(':id', templateId)
      const response = await get(url)
      
      if (response?.data) {
        currentTemplate.value = response.data
        return response.data
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new product template
   * @param {Object} payload - Template data
   */
  async function createTemplate(payload) {
    try {
      isLoading.value = true
      const response = await post(endpoints.productTemplates.create, payload)
      
      if (response?.data) {
        templates.value.push(response.data)
        return response
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update an existing template
   * @param {string} templateId
   * @param {Object} payload - Updated template data
   */
  async function updateTemplate(templateId, payload) {
    try {
      isLoading.value = true
      const url = endpoints.productTemplates.update.replace(':id', templateId)
      const response = await put(url, payload)
      
      if (response?.data) {
        // Update in templates array
        const idx = templates.value.findIndex(t => t.id === templateId)
        if (idx >= 0) {
          templates.value[idx] = response.data
        }
        
        // Update in category cache
        if (response.data.categoryId && templatesByCategory.value[response.data.categoryId]) {
          templatesByCategory.value[response.data.categoryId] = response.data
        }
        
        currentTemplate.value = response.data
        return response
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a template
   * @param {string} templateId
   */
  async function deleteTemplate(templateId) {
    try {
      isLoading.value = true
      const url = endpoints.productTemplates.delete.replace(':id', templateId)
      const response = await deleteRequest(url)
      
      if (response?.status) {
        // Remove from templates array
        templates.value = templates.value.filter(t => t.id !== templateId)
        
        // Clear from category cache
        Object.keys(templatesByCategory.value).forEach(catId => {
          if (templatesByCategory.value[catId]?.id === templateId) {
            templatesByCategory.value[catId] = null
          }
        })
        
        if (currentTemplate.value?.id === templateId) {
          currentTemplate.value = null
        }
      }
      
      return response
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get cached template for category, or fetch if not cached
   * @param {string} categoryId
   * @param {boolean} force - Force refresh from API
   */
  async function getCachedTemplateByCategory(categoryId, force = false) {
    if (!force && templatesByCategory.value[categoryId] !== undefined) {
      return templatesByCategory.value[categoryId]
    }
    return getTemplateByCategory(categoryId)
  }

  /**
   * Clear template cache for a category
   * @param {string} categoryId
   */
  function clearCategoryCache(categoryId) {
    delete templatesByCategory.value[categoryId]
  }

  /**
   * Clear all caches
   */
  function clearCaches() {
    templates.value = []
    templatesByCategory.value = {}
    currentTemplate.value = null
  }

  return {
    // State
    templates,
    templatesByCategory,
    currentTemplate,
    isLoading,
    // Methods
    getTemplates,
    getTemplateByCategory,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getCachedTemplateByCategory,
    clearCategoryCache,
    clearCaches
  }
})
