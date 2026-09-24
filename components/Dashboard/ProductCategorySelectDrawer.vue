<script setup>
import noCategoryImage from '~/assets/img/no-category.svg'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  recentCategories: {
    type: Array,
    default: () => [],
  },
  systemCategories: {
    type: Array,
    default: () => [],
  },
  selectedCategoryId: {
    type: [String, Number],
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:open', 'select', 'add-category'])

const search = ref('')
const selectedCategory = ref(null)
const activeParent = ref(null)

const normaliseId = (value) => String(value ?? '')

const allRecentCategories = computed(() =>
  (props.recentCategories.length ? props.recentCategories : props.categories).map((category) => ({
    ...category,
    _source: category._source || 'tenant',
  }))
)

const allSystemCategories = computed(() =>
  props.systemCategories.map((category) => ({
    ...category,
    _source: category._source || 'system',
  }))
)

const categoryChildren = (category) => {
  if (!category) return []
  return category.children || category.subCategories || category.subcategories || []
}

const hasChildren = (category) =>
  category?.hasChildren === true
  || category?.hasActiveChildren === true
  || categoryChildren(category).length > 0
  || allSystemCategories.value.some((item) =>
    normaliseId(item.parentId || item.parent?.id) === normaliseId(category.id)
  )

const rootSystemCategories = computed(() => {
  const childIds = new Set()
  allSystemCategories.value.forEach((category) => {
    categoryChildren(category).forEach((child) => childIds.add(normaliseId(child.id)))
  })

  return allSystemCategories.value.filter((category) => {
    if (category.parentId || category.parent?.id) return false
    return !childIds.has(normaliseId(category.id))
  })
})

const activeCategories = computed(() => {
  if (activeParent.value) {
    const nested = categoryChildren(activeParent.value)
    if (nested.length) {
      return nested.map((category) => ({
        ...category,
        _source: category._source || activeParent.value?._source || 'system',
      }))
    }

    return allSystemCategories.value.filter((category) =>
      normaliseId(category.parentId || category.parent?.id) === normaliseId(activeParent.value.id)
    )
  }

  return rootSystemCategories.value
})

const isListable = (category) => category?.listable !== false

const searchableCategories = computed(() => {
  const byId = new Map()
  ;[...allRecentCategories.value, ...allSystemCategories.value].forEach((category) => {
    if (category?.id) byId.set(`${category._source}:${category.id}`, category)
  })
  return [...byId.values()]
})

const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return activeCategories.value

  return searchableCategories.value.filter((category) =>
    String(category.name || '').toLowerCase().includes(term)
  )
})

const recentMatches = computed(() => {
  if (activeParent.value) return []
  const term = search.value.trim().toLowerCase()
  const categories = allRecentCategories.value.filter(isListable)
  if (!term) return categories.slice(0, 6)
  return categories.filter((category) =>
    String(category.name || '').toLowerCase().includes(term)
  ).slice(0, 6)
})

const canSelect = computed(() => Boolean(selectedCategory.value?.id) && isListable(selectedCategory.value))

const drawerTitle = computed(() => activeParent.value ? 'Categories' : 'Categories')

const isSelectedCategory = (category) =>
  normaliseId(selectedCategory.value?.id) === normaliseId(category.id)
  && (selectedCategory.value?._source || 'tenant') === (category._source || 'tenant')

const shouldShowRadio = (category) => isListable(category)

const showRecentSection = computed(() =>
  !activeParent.value && recentMatches.value.length > 0
)

const showSystemLabel = computed(() => showRecentSection.value && filteredCategories.value.length > 0)

watch(() => props.open, (open) => {
  if (!open) return

  search.value = ''
  activeParent.value = null
  const allAvailable = [...allRecentCategories.value, ...allSystemCategories.value]
  selectedCategory.value = allAvailable.find((category) =>
    normaliseId(category.id) === normaliseId(props.selectedCategoryId)
  ) || null
})

watch(() => props.selectedCategoryId, (id) => {
  if (!props.open) return
  const allAvailable = [...allRecentCategories.value, ...allSystemCategories.value]
  selectedCategory.value = allAvailable.find((category) =>
    normaliseId(category.id) === normaliseId(id)
  ) || null
})

function closeDrawer() {
  emit('update:open', false)
}

function goBack() {
  activeParent.value = null
  search.value = ''
}

function viewChildren(category) {
  activeParent.value = category
  search.value = ''
}

function selectCategory(category) {
  if (!isListable(category)) return
  selectedCategory.value = category
}

function confirmSelection() {
  if (!canSelect.value) return
  emit('select', selectedCategory.value)
  closeDrawer()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="category-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[120] bg-[#003366]/35"
        @click.self="closeDrawer"
      >
        <aside class="ml-auto flex h-full w-full max-w-[58rem] flex-col rounded-l-[18px] bg-white px-[2.4rem] py-[2.8rem] shadow-2xl">
          <header class="mb-[2.4rem] grid grid-cols-[1fr_auto_1fr] items-center gap-[1.6rem]">
            <button
              v-if="activeParent"
              type="button"
              class="flex items-center gap-[1rem] justify-self-start text-[1.6rem] font-[400] text-[#1B1B19] rounded-lg focus:ring-2 focus:ring-primary focus:outline-none p-1"
              @click="goBack"
            >
              <span class="material-symbols-outlined text-[2.4rem]" aria-hidden="true">arrow_back</span>
              Go Back
            </button>
            <span v-else />

            <h2 class="justify-self-center text-[2.2rem] font-[700] leading-[3rem] text-[#000]">
              {{ drawerTitle }}
            </h2>

            <button
              type="button"
              class="flex h-[3.2rem] w-[3.2rem] items-center justify-center justify-self-end rounded-full border border-[#1B1B19] text-[#1B1B19] focus:ring-2 focus:ring-primary focus:outline-none"
              aria-label="Close categories"
              @click="closeDrawer"
            >
              <span class="material-symbols-outlined text-[2rem]" aria-hidden="true">close</span>
            </button>
          </header>

          <div class="relative mb-[2rem]">
            <span class="material-symbols-outlined pointer-events-none absolute left-[1.8rem] top-1/2 -translate-y-1/2 text-[3rem] text-[#1B1B19]" aria-hidden="true">
              search
            </span>
            <input
              v-model="search"
              type="search"
              placeholder="Search categories"
              aria-label="Search categories"
              class="h-[5.6rem] w-full rounded-[10px] border border-[#E0E0E0] bg-white pl-[6.4rem] pr-[1.6rem] text-[1.6rem] text-[#1B1B19] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div
              v-if="loading"
              class="flex h-full items-center justify-center text-[1.5rem] text-[#616161]"
            >
              Loading categories...
            </div>

            <div
              v-else-if="filteredCategories.length || recentMatches.length"
              class="space-y-[1.6rem]"
            >
              <section v-if="showRecentSection" class="space-y-[0.8rem]">
                <p class="px-[0.4rem] text-[1.2rem] font-[700] uppercase tracking-[0.08em] text-[#7A7A7A]">
                  Recently used
                </p>
                <div
                  v-for="category in recentMatches"
                  :key="`recent-${category.id}`"
                  class="flex min-h-[5.6rem] items-center gap-[1.2rem]"
                >
                  <button
                    type="button"
                    class="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                    :class="isSelectedCategory(category) ? 'border-primary' : 'border-[#657786]'"
                    :aria-label="`Select ${category.name}`"
                    @click="selectCategory(category)"
                  >
                    <span
                      v-if="isSelectedCategory(category)"
                      class="h-[1.2rem] w-[1.2rem] rounded-full bg-primary"
                    />
                  </button>
                  <button
                    type="button"
                    class="flex flex-1 items-center py-[1.2rem] text-left text-[1.6rem] transition-colors"
                    :class="isSelectedCategory(category) ? 'font-[600] text-primary' : 'font-[400] text-[#616161]'"
                    @click="selectCategory(category)"
                  >
                    {{ category.name }}
                  </button>
                </div>
              </section>

              <p v-if="showSystemLabel" class="px-[0.4rem] text-[1.2rem] font-[700] uppercase tracking-[0.08em] text-[#7A7A7A]">
                System categories
              </p>

              <section class="space-y-[0.8rem]">
              <div
                v-for="category in filteredCategories"
                :key="`${category._source || 'system'}-${category.id}`"
                class="flex min-h-[5.6rem] items-center gap-[1.2rem]"
              >
                <button
                  v-if="shouldShowRadio(category)"
                  type="button"
                  class="flex h-[2.4rem] w-[2.4rem] shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  :class="isSelectedCategory(category) ? 'border-primary' : 'border-[#657786]'"
                  :aria-label="`Select ${category.name}`"
                  @click="selectCategory(category)"
                >
                  <span
                    v-if="isSelectedCategory(category)"
                    class="h-[1.2rem] w-[1.2rem] rounded-full bg-primary"
                  />
                </button>

                <button
                  type="button"
                  class="flex flex-1 items-center py-[1.2rem] text-left text-[1.6rem] transition-colors"
                  :class="[
                    isSelectedCategory(category) ? 'font-[600] text-primary' : 'font-[400] text-[#616161]',
                    !isListable(category) && !hasChildren(category) ? 'opacity-60' : ''
                  ]"
                  @click="shouldShowRadio(category) ? selectCategory(category) : viewChildren(category)"
                >
                  {{ category.name }}
                </button>

                <button
                  v-if="hasChildren(category)"
                  type="button"
                  class="flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center text-[#1B1B19] rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
                  :aria-label="`View ${category.name} subcategories`"
                  @click.stop="viewChildren(category)"
                >
                  <span class="material-symbols-outlined text-[3rem]" aria-hidden="true">chevron_right</span>
                </button>
              </div>
              </section>
            </div>

            <div
              v-else
              class="flex h-full flex-col items-center justify-center text-center"
            >
              <img
                :src="noCategoryImage"
                class="mb-[2rem] h-[11.4rem] w-[9rem]"
                alt=""
              >
              <h3 class="mb-[1.2rem] text-[2rem] font-[700] text-[#000]">
                Can't find a matching category?
              </h3>
              <p class="mb-[3.2rem] text-[1.5rem] text-[#1B1B19]">
                Add your own custom category.
              </p>
              <button
                type="button"
                class="text-[1.8rem] font-[700] text-primary"
                @click="emit('add-category')"
              >
                Add category
              </button>
            </div>
          </div>

          <footer class="mt-[2.4rem] border-t border-[#BDBDBD] pt-[2.4rem] flex justify-between">
            <BaseButton
              type="button"
              variant="primary"
              class="ml-auto h-[5.6rem] w-full max-w-[25rem] rounded-[10px] text-[1.6rem]"
              :disabled="!canSelect"
              @click="confirmSelection"
            >
              Select category
            </BaseButton>
              
              <BaseButton
              type="button"
              variant="outline"
              class="ml-auto h-[5.6rem] w-full max-w-[25rem] rounded-[10px] text-[1.6rem]"
              @click="emit('add-category')"
            >
              Add New Category
            </BaseButton>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.category-fade-enter-active,
.category-fade-leave-active {
  transition: opacity 0.18s ease;
}

.category-fade-enter-from,
.category-fade-leave-to {
  opacity: 0;
}
</style>
