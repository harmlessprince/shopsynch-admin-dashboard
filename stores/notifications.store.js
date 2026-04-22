import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { endpoints } from "~/utils/endpoints.js";
import { useApiService } from "~/services/apiService.js";

export const useNotificationsStore = defineStore("notificationsStore", () => {
    const { get, patch, delete: del } = useApiService();
    const notifications = ref([]);
    const loading = ref(false);
    const unreadCount = ref(0);
    const pagination = ref({
        page: 0,
        limit: 20,
        totalPages: 0,
        totalElements: 0,
    });

    const fetchNotifications = async (page = 0) => {
        loading.value = true;
        try {
            const response = await get(endpoints.notifications.all, {
                page,
                limit: pagination.value.limit,
                withCursor: false
            }, { silent: true, forceMode: 'live' });
            
            if (response?.status) {
                if (page === 0) {
                    notifications.value = response.data.notifications;
                } else {
                    notifications.value = [...notifications.value, ...response.data.notifications];
                }
                
                pagination.value = {
                    page: response.data.currentPage,
                    limit: pagination.value.limit,
                    totalPages: response.data.totalPages,
                    totalElements: response.data.totalElements,
                };
                
                // Approximate unread count (real count should come from a dedicated meta field if available)
                // Here we filter the current list.
                updateUnreadCount();
            }
            return response;
        } finally {
            loading.value = false;
        }
    };

    const markAsRead = async (notificationId) => {
        const url = endpoints.notifications.read.replace(':id', notificationId);
        const response = await patch(url, {}, { forceMode: 'live' });
        if (response?.status) {
            const index = notifications.value.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                notifications.value[index].read = true;
                notifications.value[index].readAt = new Date().toISOString();
                updateUnreadCount();
            }
        }
        return response;
    };

    const markAllAsRead = async () => {
        const response = await patch(endpoints.notifications.readAll, {}, { forceMode: 'live' });
        if (response?.status) {
            notifications.value = notifications.value.map(n => ({
                ...n,
                read: true,
                readAt: n.readAt || new Date().toISOString()
            }));
            unreadCount.value = 0;
        }
        return response;
    };

    const deleteNotification = async (notificationId) => {
        const url = endpoints.notifications.delete.replace(':id', notificationId);
        const response = await del(url, { forceMode: 'live' });
        if (response?.status) {
            notifications.value = notifications.value.filter(n => n.id !== notificationId);
            updateUnreadCount();
        }
        return response;
    };

    const updateUnreadCount = () => {
        unreadCount.value = notifications.value.filter(n => !n.read).length;
    };

    return {
        notifications,
        loading,
        unreadCount,
        pagination,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };
});
