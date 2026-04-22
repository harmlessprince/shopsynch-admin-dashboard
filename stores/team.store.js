import { defineStore } from 'pinia';
import { endpoints } from '~/utils/endpoints.js';
import { useApiService } from '~/services/apiService.js';
import { useToastStore } from '~/stores/toast.store.js';

function buildUrl(template, params) {
    return Object.entries(params).reduce(
        (url, [key, val]) => url.replace(`:${key}`, val),
        template
    );
}

export const useTeamStore = defineStore('teamStore', () => {
    const { get, post, patch, delete: del } = useApiService();
    const toastStore = useToastStore();

    const members = ref([]);
    const invitations = ref([]);
    const roles = ref([]);
    const permissions = ref([]);
    const loading = ref(false);

    async function fetchMembers(tenantId) {
        loading.value = true;
        try {
            const url = buildUrl(endpoints.team.members, { tenantId });
            const res = await get(url, {}, {forceMode: 'live'});
            members.value = res?.data ?? [];
        } finally {
            loading.value = false;
        }
    }

    async function inviteUser(tenantId, payload) {
        const url = buildUrl(endpoints.team.inviteUser, { tenantId });
        const res = await post(url, payload, {forceMode: 'live'});
        if (res) {
            invitations.value.push(res?.data);
            toastStore.success(`Invitation sent to ${payload.email}`);
        }
        return res;
    }

    async function updateMemberRole(tenantId, userId, payload) {
        const url = buildUrl(endpoints.team.updateMember, { tenantId, userId });
        const res = await patch(url, payload, {forceMode: 'live'});
        if (res) {
            const idx = members.value.findIndex(m => m.id === userId);
            if (idx !== -1) members.value[idx] = { ...members.value[idx], ...res?.data };
        }
        return res;
    }

    async function removeMember(tenantId, userId) {
        const url = buildUrl(endpoints.team.removeMember, { tenantId, userId });
        const res = await del(url, {forceMode: 'live'});
        if (res !== undefined) {
            members.value = members.value.filter(m => m.id !== userId);
        }
        return res;
    }

    async function fetchInvitations(tenantId) {
        const url = buildUrl(endpoints.team.invitations, { tenantId });
        const res = await get(url, {}, {forceMode: 'live'});
        invitations.value = res?.data ?? [];
    }

    async function cancelInvitation(invitationId) {
        const url = buildUrl(endpoints.team.cancelInvite, { invitationId });
        const res = await del(url, {forceMode: 'live'});
        if (res !== undefined) {
            invitations.value = invitations.value.filter(i => i.id !== invitationId);
            toastStore.success('Invitation cancelled');
        }
        return res;
    }

    async function resendInvitation(invitationId) {
        const url = `/v1/invitations/${invitationId}/resend`;
        const res = await post(url, {}, {forceMode: 'live'});
        if (res) {
            toastStore.success('Invitation resent');
        }
        return res;
    }

    async function fetchPermissions(tenantId) {
        const url = buildUrl(endpoints.team.permissions, { tenantId });
        const res = await get(url, {}, {forceMode: 'live'});
        permissions.value = res?.data ?? [];
    }

    async function fetchRoles(tenantId) {
        const url = buildUrl(endpoints.team.roles, { tenantId });
        const res = await get(url, {}, {forceMode: 'live'});
        roles.value = res?.data ?? [];
    }

    async function createRole(tenantId, payload) {
        const url = buildUrl(endpoints.team.roles, { tenantId });
        const res = await post(url, payload, {forceMode: 'live'});
        if (res) {
            roles.value.push(res?.data);
            toastStore.success(`Role '${payload.name}' created`);
        }
        return res;
    }

    async function updateRole(tenantId, roleId, payload) {
        const url = buildUrl(endpoints.team.roleById, { tenantId, roleId });
        const res = await patch(url, payload, {forceMode: 'live'});
        if (res) {
            const idx = roles.value.findIndex(r => r.id === roleId);
            if (idx !== -1) roles.value[idx] = { ...roles.value[idx], ...res?.data };
            toastStore.success(`Role '${payload.name}' updated`);
        }
        return res;
    }

    async function deleteRole(tenantId, roleId) {
        const url = buildUrl(endpoints.team.roleById, { tenantId, roleId });
        const res = await del(url, {forceMode: 'live'});
        if (res !== undefined) {
            roles.value = roles.value.filter(r => r.id !== roleId);
            toastStore.success('Role deleted');
        }
        return res;
    }

    return {
        members,
        invitations,
        roles,
        permissions,
        loading,
        fetchMembers,
        inviteUser,
        updateMemberRole,
        removeMember,
        fetchInvitations,
        cancelInvitation,
        resendInvitation,
        fetchPermissions,
        fetchRoles,
        createRole,
        updateRole,
        deleteRole,
    };
});
