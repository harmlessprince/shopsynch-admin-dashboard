import { defineStore } from "pinia";
import { ref } from "vue";

export const useCollectionsStore = defineStore("collectionsStore", () => {
  const collections = ref([]);
  const isLoading = ref(false);

  async function getCollections() {
    return { status: true, data: [] };
  }

  async function associateProducts() {
    return { status: true };
  }

  return {
    collections,
    isLoading,
    getCollections,
    associateProducts,
  };
});
