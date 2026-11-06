<script setup>
import { ref, computed } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
);

const props = defineProps({
  timeseries: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

// Toggle between volume (calls/questions) and cost/tokens
const activeMetric = ref("questions"); // 'questions' | 'cost'

const labels = computed(() => {
  return (props.timeseries || []).map((t) => {
    if (!t.timestamp) return "";
    const date = new Date(t.timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
});

const chartData = computed(() => {
  if (activeMetric.value === "questions") {
    return {
      labels: labels.value,
      datasets: [
        {
          type: "bar",
          label: "Questions",
          data: (props.timeseries || []).map((t) => t.questionCount || 0),
          backgroundColor: "#4F46E5",
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          type: "line",
          label: "Model Calls",
          data: (props.timeseries || []).map((t) => t.callCount || 0),
          borderColor: "#06B6D4",
          backgroundColor: "#06B6D4",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }

  // Cost & Tokens view
  return {
    labels: labels.value,
    datasets: [
      {
        type: "line",
        label: "Cost (USD)",
        data: (props.timeseries || []).map((t) => t.costUsd || 0),
        borderColor: "#10B981",
        backgroundColor: "#10B981",
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: "y",
      },
      {
        type: "bar",
        label: "Tokens (k)",
        data: (props.timeseries || []).map((t) => Math.round((t.totalTokens || 0) / 1000)),
        backgroundColor: "#F59E0B",
        borderRadius: 6,
        barPercentage: 0.6,
        yAxisID: "y1",
      },
    ],
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        boxWidth: 14,
        usePointStyle: true,
        pointStyle: "circle",
        font: { size: 13, weight: "600" },
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "#1E293B",
      titleFont: { size: 14, weight: "bold" },
      bodyFont: { size: 13 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => {
          const val = context.parsed.y;
          if (activeMetric.value === "cost") {
            if (context.datasetIndex === 0) return ` Cost: $${val.toFixed(2)}`;
            return ` Tokens: ${val.toLocaleString()}k`;
          }
          return ` ${context.dataset.label}: ${val.toLocaleString()}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 12 }, color: "#64748B" },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#F1F5F9" },
      ticks: {
        font: { size: 12 },
        color: "#64748B",
        callback: (v) => (activeMetric.value === "cost" ? `$${v}` : v),
      },
    },
    ...(activeMetric.value === "cost"
      ? {
          y1: {
            type: "linear",
            display: true,
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              font: { size: 12 },
              color: "#64748B",
              callback: (v) => `${v}k`,
            },
          },
        }
      : {}),
  },
}));
</script>

<template>
  <div class="bg-white rounded-xl p-[2rem] border border-slate-200 shadow-sm text-[1.4rem]">
    <!-- Header with Toggle Buttons -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-[1.2rem] mb-[2rem]">
      <div>
        <h2 class="text-[1.8rem] font-[700] text-slate-900">Activity & Cost Trajectory</h2>
        <p class="text-[1.3rem] text-slate-500 mt-[0.4rem]">
          Daily volume trends, model invocations, and token burn rate
        </p>
      </div>

      <div class="inline-flex rounded-lg bg-slate-100 p-[0.4rem] border border-slate-200 text-[1.3rem] font-[600]">
        <button
          type="button"
          class="px-[1.4rem] py-[0.6rem] rounded-md transition-all cursor-pointer"
          :class="
            activeMetric === 'questions'
              ? 'bg-white text-indigo-700 shadow-sm font-[700]'
              : 'text-slate-600 hover:text-slate-900'
          "
          @click="activeMetric = 'questions'"
        >
          Questions & Calls
        </button>
        <button
          type="button"
          class="px-[1.4rem] py-[0.6rem] rounded-md transition-all cursor-pointer"
          :class="
            activeMetric === 'cost'
              ? 'bg-white text-emerald-700 shadow-sm font-[700]'
              : 'text-slate-600 hover:text-slate-900'
          "
          @click="activeMetric = 'cost'"
        >
          Cost & Tokens
        </button>
      </div>
    </div>

    <!-- Chart Canvas Container -->
    <div class="h-[30rem] w-full relative">
      <div
        v-if="loading"
        class="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
      >
        <div class="flex items-center gap-[0.8rem] text-slate-500 text-[1.4rem] font-[500]">
          <span class="material-symbols-outlined animate-spin text-primary text-[2.2rem]">progress_activity</span>
          <span>Loading trajectory data…</span>
        </div>
      </div>

      <div
        v-else-if="!timeseries || timeseries.length === 0"
        class="h-full flex flex-col items-center justify-center text-slate-400 text-[1.4rem]"
      >
        <span class="material-symbols-outlined text-[3.6rem] mb-[0.8rem]">show_chart</span>
        <p class="font-[500]">No timeseries activity recorded for this period</p>
      </div>

      <component
        :is="activeMetric === 'questions' ? Bar : Bar"
        v-else
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>
