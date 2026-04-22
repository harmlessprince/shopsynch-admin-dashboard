<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  iconColor: {
    type: String,
    required: false,
  },
  value: {
    type: Number,
    required: true,
  },
  format: {
    type: Boolean,
    required: false,
    default: false,
  },
  loading: { type: Boolean, default: false },
  formatType: {
    type: String,
    required: false,
    default: 'money', 
  },
})
</script>
<template>
  <div class="bg-[#fff] rounded-[10px] h-[11.8rem] p-[2.4rem] flex flex-col justify-between">
    
    <template v-if="loading">
      <div class="animate-pulse w-full">
        <div class="flex justify-between items-center">
          <div class="h-4 bg-slate-200 rounded w-1/3"></div>
          <div class="h-6 w-6 bg-slate-200 rounded-full"></div>
        </div>
        <div class="h-8 bg-slate-200 rounded w-1/2 mt-[2.4rem]"></div>
      </div>
    </template>

    <template v-else>
      <div class="flex justify-between items-center">
        <span class="text-[#64748b]">{{ title }}</span>
        <img :src="icon" alt="icon" class="w-[24px] h-[24px]"/>
      </div>
      <div class="font-[700] text-[2.4rem] mt-[2.4rem]">
        <span v-if="formatToMoney == 'money' && format">{{  formatToMoney(value) }}</span> 
        <span v-else>{{ value}}</span>
      </div>
    </template>

  </div>

</template>