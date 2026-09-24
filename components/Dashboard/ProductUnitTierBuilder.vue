<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useProductStore } from '~/stores/products.store.js'
import { logger, FIXED_UNIT_OPTIONS } from '~/utils/helpers.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  tenantId: {
    type: String,
    default: '',
  },
  locked: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'update:isValid'])

const productStore = useProductStore()

const TRACKING_MODES = [
  { value: 'SINGLE_UNIT', label: 'Single unit', icon: 'looks_one', description: 'Sold one at a time, like a phone or a bag of rice' },
  { value: 'CUSTOM_TIERED', label: 'My own units', icon: 'layers', description: 'Like cup, paint, or bag' },
  { value: 'FIXED_WEIGHT', label: 'By weight', icon: 'scale', description: 'Grams and kilograms (kg)' },
  { value: 'FIXED_VOLUME', label: 'By volume', icon: 'water_drop', description: 'Millilitres (ml) and litres' },
]

const CATEGORY_OPTIONS = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'GRAIN', label: 'Grain' },
  { value: 'PRODUCE', label: 'Produce' },
  { value: 'LIQUID', label: 'Liquid' },
  // { value: 'VOLUME', label: 'Volume' },
  // { value: 'WEIGHT', label: 'Weight' },
  { value: 'OTHER', label: 'Other' },
]

function emptyTier(isBase) {
  return { unitKey: '', defaultLabel: '', multiplierFromBase: isBase ? 1 : '', active: true }
}

function update(patch) {
  if (props.locked) return
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const trackingMode = computed({
  get: () => props.modelValue.unitTrackingMode,
  set: (value) => update({ unitTrackingMode: value }),
})

const category = computed({
  get: () => props.modelValue.unitCategory,
  set: (value) => update({ unitCategory: value }),
})

const tiers = computed(() => props.modelValue.unitTiers || [])

const isCustomTiered = computed(() => trackingMode.value === 'CUSTOM_TIERED')
const isFixedUnitsMode = computed(() => Boolean(FIXED_UNIT_OPTIONS[trackingMode.value]))
const fixedUnitOptions = computed(() =>
  (FIXED_UNIT_OPTIONS[trackingMode.value] || []).map((option) => ({ value: option.key, label: option.label }))
)

function stockUnitStorageKey(mode) {
  return `shopsynch:preferred-stock-unit:${mode}`
}

const stockEntryUnitKey = computed({
  get: () => props.modelValue.stockEntryUnitKey,
  set: (value) => {
    update({ stockEntryUnitKey: value })
    if (typeof window !== 'undefined' && trackingMode.value) {
      window.localStorage.setItem(stockUnitStorageKey(trackingMode.value), value)
    }
  },
})
function pluralize(name) {
  return /s$/i.test(name) ? name : `${name}s`
}

const baseUnitName = computed(() => {
  const name = tiers.value[0]?.defaultLabel?.trim()
  return name ? pluralize(name) : 'your smallest unit'
})

function setTiers(next) {
  update({ unitTiers: next })
}

function normalizeUnitKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function updateTierName(index, name) {
  setTiers(
    tiers.value.map((tier, i) =>
      i === index ? { ...tier, defaultLabel: name, unitKey: normalizeUnitKey(name) } : tier
    )
  )
}

function updateTierMultiplier(index, value) {
  setTiers(tiers.value.map((tier, i) => (i === index ? { ...tier, multiplierFromBase: value } : tier)))
}

function addTier() {
  setTiers([...tiers.value, emptyTier(false)])
}

function removeTier(index) {
  if (index === 0) return
  setTiers(tiers.value.filter((_, i) => i !== index))
}

function applySuggestion(index, suggestion) {
  updateTierName(index, suggestion.labels?.en || suggestion.unitKey)
}

function applyScaffold(scaffold) {
  if (props.locked) return
  emit('update:modelValue', {
    ...props.modelValue,
    unitTrackingMode: scaffold.unitTrackingMode,
    unitCategory: scaffold.unitCategory,
    unitTiers: (scaffold.unitTiers || []).map((tier) => ({
      unitKey: tier.unitKey,
      defaultLabel: tier.defaultLabel,
      multiplierFromBase: tier.multiplierFromBase,
      active: tier.active !== false,
    })),
  })
}

const suggestions = ref([])
const scaffolds = ref([])

async function loadSuggestions() {
  if (!category.value) {
    suggestions.value = []
    return
  }
  try {
    const response = await productStore.getUnitSuggestions(category.value)
    suggestions.value = response?.data || []
  } catch (error) {
    logger.error('Failed to load unit suggestions', error)
    suggestions.value = []
  }
}

async function loadScaffolds() {
  try {
    const response = await productStore.getUnitScaffolds(category.value, props.tenantId)
    scaffolds.value = response?.data || []
  } catch (error) {
    logger.error('Failed to load unit scaffolds', error)
    scaffolds.value = []
  }
}

watch(trackingMode, (mode) => {
  if (mode === 'CUSTOM_TIERED' && !tiers.value.length) {
    setTiers([emptyTier(true)])
  }

  const options = FIXED_UNIT_OPTIONS[mode]
  if (options && !options.some((option) => option.key === stockEntryUnitKey.value)) {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(stockUnitStorageKey(mode)) : null
    stockEntryUnitKey.value = options.find((option) => option.key === stored)?.key || options[options.length - 1].key
  }
}, { immediate: true })

watch(category, () => {
  if (isCustomTiered.value) loadSuggestions()
})

onMounted(() => {
  if (isCustomTiered.value) {
    loadSuggestions()
    loadScaffolds()
  }
})

const validationErrors = computed(() => {
  if (!isCustomTiered.value) return []
  const list = tiers.value
  if (!list.length) return ['Add the smallest unit you sell this in.']

  const errors = []
  const baseMultiplier = Number(list[0]?.multiplierFromBase) || 1

  const seenNames = new Set()
  list.forEach((tier, index) => {
    const name = tier.defaultLabel?.trim()
    const label = index === 0 ? 'Your smallest unit' : `Unit ${index + 1}`

    if (!name) {
      errors.push(`${label} needs a name.`)
    } else {
      const normalized = normalizeUnitKey(name)
      if (tier.active !== false) {
        if (seenNames.has(normalized)) {
          errors.push(`You've already used the name "${name}" for another unit.`)
        }
        seenNames.add(normalized)
      }
    }

    if (index === 0) return

    const multiplier = Number(tier.multiplierFromBase)
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      errors.push(`${label} needs a number greater than 0.`)
    } else if (multiplier <= baseMultiplier) {
      errors.push(`${label} should be a bigger amount than ${baseUnitName.value}.`)
    }
  })

  return errors
})

const isValid = computed(() => validationErrors.value.length === 0)

watch(isValid, (value) => emit('update:isValid', value), { immediate: true })
</script>

<template>
  <div>
    <div class="mb-[2.4rem]">
      <label class="mb-[1rem] block text-[1.8rem] font-[400] text-[#1B1B19]">
        How do you sell this product?
      </label>
      <div class="grid grid-cols-1 gap-[1.2rem] md:grid-cols-4">
        <button
          v-for="mode in TRACKING_MODES"
          :key="mode.value"
          type="button"
          class="flex min-h-[8.8rem] items-start gap-[1.6rem] rounded-[10px] border bg-white p-[1.6rem] text-left transition hover:border-primary"
          :class="[
            trackingMode === mode.value ? 'border-primary bg-primary/5' : 'border-[#D9D9D9]',
            locked ? 'cursor-not-allowed opacity-70 hover:border-[#D9D9D9]' : ''
          ]"
          :disabled="locked"
          @click="trackingMode = mode.value"
        >
          <span
            class="material-symbols-outlined h-[4rem] w-[4rem] shrink-0 items-center justify-center rounded-[8px] text-[2.2rem] leading-none flex"
            :class="trackingMode === mode.value ? 'bg-primary text-white' : 'bg-[#F1F5F9] text-[#64748B]'"
          >
            {{ mode.icon }}
          </span>
          <span class="min-w-0">
            <span
              class="block text-[1.5rem] font-[700] leading-[2rem]"
              :class="trackingMode === mode.value ? 'text-primary' : 'text-[#1B1B19]'"
            >
              {{ mode.label }}
            </span>
            <span class="mt-[0.4rem] block text-[1.3rem] leading-[1.8rem] text-[#7A7A7A]">
              {{ mode.description }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <div v-if="trackingMode !== 'SINGLE_UNIT'" class="unit-category-select mb-[2.4rem] max-w-[36rem]">
      <BaseSelectInput
        v-model="category"
        label="What kind of product is this?"
        name="unitCategory"
        placeholder="Choose one"
        :options="CATEGORY_OPTIONS"
        :disabled="locked"
      />
    </div>

    <article
      v-if="isFixedUnitsMode"
      class="rounded-[10px] border border-[#D9D9D9] bg-white px-[2.4rem] py-[2rem]"
    >
      <p class="mb-[1.6rem] text-[1.4rem] text-[#616161]">
        {{ trackingMode === 'FIXED_WEIGHT'
          ? "Stock is tracked in grams and displayed in kilograms (1 kg = 1,000 g)."
          : "Stock is tracked in millilitres and displayed in litres (1 L = 1,000 mL)." }}
      </p>
      <div class="unit-category-select max-w-[28rem]">
        <BaseSelectInput
          v-model="stockEntryUnitKey"
          label="Which unit do you want to log stock in?"
          name="stockEntryUnitKey"
          placeholder="Choose one"
          :options="fixedUnitOptions"
          :disabled="locked"
        />
      </div>
      <p class="mt-[1.2rem] text-[1.3rem] text-[#7A7A7A]">
        Enter quantities in this unit. The system converts them to base units automatically.
      </p>
    </article>

    <template v-else-if="isCustomTiered">
      <div v-if="scaffolds.length" class="mb-[1.6rem] flex flex-wrap gap-[1rem]">
        <button
          v-for="scaffold in scaffolds"
          :key="scaffold.productId"
          type="button"
          class="rounded-full border border-[#D9D9D9] bg-white px-[1.4rem] py-[0.8rem] text-[1.3rem] font-[500] text-[#1B1B19] transition hover:border-primary hover:text-primary"
          :class="locked ? 'cursor-not-allowed opacity-70 hover:border-[#D9D9D9] hover:text-[#1B1B19]' : ''"
          :disabled="locked"
          @click="applyScaffold(scaffold)"
        >
          Use the same units as {{ scaffold.productName }}
        </button>
      </div>

      <div class="space-y-[1.6rem]">
        <article
          v-for="(tier, index) in tiers"
          :key="index"
          class="rounded-[10px] border border-[#D9D9D9] bg-white px-[2.4rem] py-[2rem]"
        >
          <div class="mb-[1.2rem] flex items-center justify-between">
            <p class="text-[1.4rem] font-[700] text-[#1B1B19]">
              {{ index === 0 ? 'Your smallest unit' : `Unit ${index + 1}` }}
            </p>
            <button
              v-if="index > 0"
              type="button"
              class="text-[1.3rem] font-[600] text-rose-500 transition hover:text-rose-600"
              :class="locked ? 'cursor-not-allowed opacity-70 hover:text-rose-500' : ''"
              :disabled="locked"
              @click="removeTier(index)"
            >
              Remove
            </button>
          </div>

          <div class="grid grid-cols-1 gap-[1.6rem]" :class="index === 0 ? 'md:grid-cols-1 md:max-w-[24rem]' : 'md:grid-cols-2'">
            <AppInput
              :model-value="tier.defaultLabel"
              :name="`unit-tier-name-${index}`"
              label="What do you call it?"
              placeholder="e.g. Cup"
              input-class="product-field"
              :readonly="locked"
              @update:model-value="updateTierName(index, $event)"
            />
            <AppInput
              v-if="index > 0"
              :model-value="tier.multiplierFromBase"
              :name="`unit-tier-multiplier-${index}`"
              :label="`How many ${baseUnitName} make 1 ${tier.defaultLabel?.trim() || 'of this'}?`"
              type="number"
              placeholder="e.g. 20"
              input-class="product-field"
              :readonly="locked"
              @update:model-value="updateTierMultiplier(index, $event)"
            />
          </div>

          <div v-if="suggestions.length" class="mt-[1.2rem] flex flex-wrap gap-[0.8rem]">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.unitKey"
              type="button"
              class="rounded-full border border-[#D9D9D9] bg-white px-[1.2rem] py-[0.6rem] text-[1.3rem] font-[500] text-[#1B1B19] transition hover:border-primary hover:text-primary"
              :class="locked ? 'cursor-not-allowed opacity-70 hover:border-[#D9D9D9] hover:text-[#1B1B19]' : ''"
              :disabled="locked"
              @click="applySuggestion(index, suggestion)"
            >
              {{ suggestion.labels?.en || suggestion.unitKey }}
            </button>
          </div>
        </article>
      </div>

      <button
        type="button"
        class="mt-[1.6rem] flex h-[5.6rem] w-full items-center justify-center gap-[1rem] rounded-[10px] border border-[#D9D9D9] bg-white text-[1.6rem] font-[500] text-primary transition hover:border-primary"
        :class="locked ? 'cursor-not-allowed opacity-70 hover:border-[#D9D9D9]' : ''"
        :disabled="locked"
        @click="addTier"
      >
        <span class="material-symbols-outlined text-[2.4rem]">add</span>
        Add a bigger unit
      </button>

      <p class="mt-[1.2rem] text-[1.3rem] text-[#7A7A7A]">
        Suggested unit names. Enter the multiplier relative to your smallest unit.
      </p>

      <ul
        v-if="validationErrors.length"
        class="mt-[1.6rem] space-y-[0.4rem] rounded-[10px] bg-rose-50 px-[1.6rem] py-[1.2rem] text-[1.3rem] text-rose-600"
      >
        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.unit-category-select :deep(label) {
  margin-bottom: 1rem;
  font-size: 1.8rem;
  font-weight: 400;
  color: #1b1b19;
}

.unit-category-select :deep(select) {
  height: 5.6rem;
  border-radius: 10px;
  padding-left: 1.8rem;
  font-size: 1.6rem;
}
</style>
