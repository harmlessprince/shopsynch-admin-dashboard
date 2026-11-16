<script setup>
// Counts and flags are the backend's; the window and threshold are shown so the numbers can be read.
defineProps({
  signals: { type: Object, required: true },
});
</script>

<template>
  <div>
    <p class="mb-[1rem] text-[1.3rem] text-slate-600">
      Last {{ signals.windowDays }} days, flagged at {{ signals.threshold }} or more.
      <strong :class="signals.flagged ? 'text-[#B42318]' : 'text-[#3CA745]'">
        {{ signals.flagged ? "This merchant is flagged." : "Nothing flagged." }}
      </strong>
    </p>
    <ul class="space-y-[0.8rem]">
      <li
        v-for="item in [
          { key: 'rapid', label: 'Rapid buy and cancel', data: signals.rapidBuyAndCancel },
          { key: 'refunds', label: 'Repeated refunds', data: signals.repeatedRefunds },
        ]"
        :key="item.key"
        class="rounded-[8px] border border-slate-200 px-[1.4rem] py-[1rem] text-[1.3rem]"
      >
        <div class="flex items-center justify-between">
        <span class="font-[600] text-slate-800">{{ item.label }}</span>
        <span class="flex items-center gap-[1rem]">
          <span class="text-slate-600">{{ item.data?.count ?? 0 }} {{ item.data?.count === 1 ? "event" : "events" }}</span>
          <span
            :class="item.data?.flagged ? 'bg-[#FFBFBF] text-[#B42318]' : 'bg-gray-100 text-gray-600'"
            class="rounded-full px-[1rem] py-[0.2rem] text-[1.2rem] font-[600]"
          >
            {{ item.data?.flagged ? "Flagged" : "Not flagged" }}
          </span>
        </span>
        </div>
        <p v-if="item.data?.addOnIds?.length" class="mt-[0.6rem] break-all text-[1.2rem] text-slate-500">
          Add-ons involved: <span class="font-mono">{{ item.data.addOnIds.join(", ") }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>
