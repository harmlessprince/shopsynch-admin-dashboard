<template>
  <div class="absolute right-0 top-[calc(100%+12px)] w-[320px] md:w-[400px] bg-white rounded-[16px] shadow-xl border border-slate-200 z-[100] overflow-hidden flex flex-col max-h-[500px]">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <h3 class="text-[1.6rem] font-semibold text-slate-900">Notifications</h3>
      <button 
        v-if="notificationsStore.unreadCount > 0"
        @click="markAllAsRead"
        class="text-[1.2rem] font-medium text-primary hover:underline transition-all"
      >
        Mark all as read
      </button>
    </div>

    <!-- Notification List -->
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div v-if="notificationsStore.loading && notificationsStore.notifications.length === 0" class="p-12 flex flex-col items-center justify-center gap-4">
        <Spinner class="w-8 h-8 text-primary" />
        <p class="text-[1.4rem] text-slate-500">Loading notifications...</p>
      </div>

      <div v-else-if="notificationsStore.notifications.length === 0" class="p-12 flex flex-col items-center justify-center gap-4 text-center">
        <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
          <span class="material-symbols-outlined text-[3.2rem] text-slate-300">notifications_off</span>
        </div>
        <div>
          <p class="text-[1.6rem] font-medium text-slate-900">All caught up!</p>
          <p class="text-[1.4rem] text-slate-500 mt-1">No new notifications to show right now.</p>
        </div>
      </div>

      <div v-else class="divide-y divide-slate-50">
        <div 
          v-for="notification in notificationsStore.notifications" 
          :key="notification.id"
          @click="handleNotificationClick(notification)"
          class="group p-5 hover:bg-slate-50 transition-colors cursor-pointer relative"
          :class="{ 'bg-blue-50/30': !notification.read }"
        >
          <div class="flex gap-4">
            <!-- Icon -->
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
              :class="getNotificationStyles(notification.type).container"
            >
              <span class="material-symbols-outlined text-[2rem]" :class="getNotificationStyles(notification.type).icon">
                {{ getNotificationStyles(notification.type).symbol }}
              </span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-[1.4rem] font-semibold text-slate-900 truncate">
                  {{ resolveNotificationTitle(notification) }}
                </p>
                <span class="text-[1.1rem] text-slate-400 whitespace-nowrap mt-1">
                  {{ formatTimeAgo(notification.createdAt) }}
                </span>
              </div>
              <p
                class="text-[1.3rem] text-slate-600 mt-1 leading-relaxed break-words"
                :class="{ 'line-clamp-2': !isNotificationExpanded(notification.id) }"
              >
                {{ resolveNotificationBody(notification) }}
              </p>
              <button
                v-if="canExpandNotification(notification)"
                type="button"
                class="mt-2 text-[1.2rem] font-semibold text-primary hover:underline"
                :aria-expanded="isNotificationExpanded(notification.id)"
                @click.stop="handleNotificationExpansionClick(notification)"
              >
                {{ isNotificationExpanded(notification.id) ? 'Show less' : 'View full message' }}
              </button>
            </div>

            <!-- Unread Indicator -->
            <div v-if="!notification.read" class="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 shadow-sm shadow-primary/20"></div>
          </div>
          
          <!-- Delete Button (Hidden by default, shown on hover) -->
          <button 
            @click.stop="deleteNotification(notification.id)"
            class="absolute top-4 right-4 p-1.5 rounded-full bg-white text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:shadow-sm"
            title="Delete notification"
          >
            <span class="material-symbols-outlined text-[1.6rem]">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="notificationsStore.notifications.length > 0" class="p-4 border-t border-slate-100 text-center bg-slate-50/30">
      <button 
        v-if="notificationsStore.pagination.page < notificationsStore.pagination.totalPages - 1"
        @click="loadMore"
        :disabled="notificationsStore.loading"
        class="text-[1.3rem] font-semibold text-slate-600 hover:text-primary transition-colors disabled:opacity-50"
      >
        {{ notificationsStore.loading ? 'Loading more...' : 'Load more notifications' }}
      </button>
      <p v-else class="text-[1.2rem] text-slate-400 italic">You've reached the end</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useNotificationsStore } from '~/stores/notifications.store.js';

const notificationsStore = useNotificationsStore();
const expandedNotificationId = ref(null);

const getNotificationStyles = (type) => {
  const normalizedType = String(type || '').toUpperCase();
  const styles = {
    ABANDONED_CART_MERCHANT: { symbol: 'shopping_cart_off', icon: 'text-amber-500', container: 'bg-amber-50' },
    ORDER_CONFIRMATION: { symbol: 'check_circle', icon: 'text-emerald-500', container: 'bg-emerald-50' },
    LOW_STOCK_ALERT: { symbol: 'warning', icon: 'text-red-500', container: 'bg-red-50' },
    NEW_ORDER: { symbol: 'shopping_bag', icon: 'text-blue-500', container: 'bg-blue-50' },
    NEW_REVIEW: { symbol: 'star', icon: 'text-purple-500', container: 'bg-purple-50' },
    ORDER_STATUS_PENDING: { symbol: 'schedule', icon: 'text-gray-500', container: 'bg-gray-50' },
    ORDER_STATUS_PROCESSING: { symbol: 'cyclone', icon: 'text-indigo-500', container: 'bg-indigo-50' },
    ORDER_STATUS_SHIPPED: { symbol: 'local_shipping', icon: 'text-teal-500', container: 'bg-teal-50' },
    ORDER_STATUS_DELIVERED: { symbol: 'package_2', icon: 'text-green-600', container: 'bg-green-50' },
    ORDER_STATUS_CANCELLED: { symbol: 'cancel', icon: 'text-red-700', container: 'bg-red-50' },
    ORDER_STATUS_IN_TRANSIT: { symbol: 'transit_enterexit', icon: 'text-yellow-500', container: 'bg-yellow-50' },
    ORDER_STATUS_FAILED: { symbol: 'error', icon: 'text-red-600', container: 'bg-red-50' },
    ORDER_STATUS_ABANDONED: { symbol: 'remove_shopping_cart', icon: 'text-slate-500', container: 'bg-slate-50' },
    PAYMENT_ABANDONED_MERCHANT: { symbol: 'credit_card_off', icon: 'text-violet-500', container: 'bg-violet-50' },
    PAYMENT_CONFIRMED: { symbol: 'payments', icon: 'text-green-500', container: 'bg-green-50' },
    SNAPSHOT_FAILED: { symbol: 'running_with_errors', icon: 'text-red-500', container: 'bg-red-50' },
    SNAPSHOT_READY: { symbol: 'photo_camera', icon: 'text-blue-600', container: 'bg-blue-50' },
    WELCOME: { symbol: 'handshake', icon: 'text-pink-500', container: 'bg-pink-50' },
  };

  return styles[normalizedType] || { symbol: 'notifications', icon: 'text-slate-500', container: 'bg-slate-50' };
};

function resolveNotificationTitle(notification) {
  return notification.title || notification.data?.title || 'Notification';
}

function resolveNotificationPreview(notification) {
  return notification.body || notification.data?.body || resolveNotificationFullContent(notification);
}

function resolveNotificationFullContent(notification) {
  return notification.fullBody || notification.data?.fullBody || notification.body || notification.data?.body || '';
}

function resolveNotificationBody(notification) {
  if (isNotificationExpanded(notification.id)) {
    return resolveNotificationFullContent(notification);
  }

  return resolveNotificationPreview(notification);
}

function canExpandNotification(notification) {
  const preview = resolveNotificationPreview(notification);
  const fullContent = resolveNotificationFullContent(notification);

  return fullContent && (fullContent !== preview || fullContent.length > 120);
}

function isNotificationExpanded(notificationId) {
  return expandedNotificationId.value === notificationId;
}

function toggleNotificationExpansion(notification) {
  expandedNotificationId.value = isNotificationExpanded(notification.id) ? null : notification.id;
}

const handleNotificationExpansionClick = async (notification) => {
  toggleNotificationExpansion(notification);

  if (!notification.read) {
    await notificationsStore.markAsRead(notification.id);
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const handleNotificationClick = async (notification) => {
  if (canExpandNotification(notification)) {
    toggleNotificationExpansion(notification);
  }

  if (!notification.read) {
    await notificationsStore.markAsRead(notification.id);
  }
  // Optional: Add navigation logic here based on notification.data.orderId etc.
};

const markAllAsRead = () => {
  notificationsStore.markAllAsRead();
};

const deleteNotification = (id) => {
  notificationsStore.deleteNotification(id);
};

const loadMore = () => {
  notificationsStore.fetchNotifications(notificationsStore.pagination.page + 1);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #CBD5E1;
}
</style>
