/**
 * React Query hooks for the SaaS Notifications & Workflows service.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchChannels,
    createChannel,
    deleteChannel,
    fetchWorkflows,
    createWorkflow,
    updateWorkflowStatus,
    triggerWorkflow,
    fetchNotifications,
    sendNotification,
    fetchApprovals,
    respondToApproval,
    type ChannelCreate,
    type WorkflowCreate,
    type NotificationPayload,
} from "@/lib/notifications";

// ── Channels ─────────────────────────────────────────────────────

export const useChannels = () =>
    useQuery({ queryKey: ["notif-channels"], queryFn: fetchChannels });

export const useCreateChannel = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: ChannelCreate) => createChannel(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-channels"] }),
    });
};

export const useDeleteChannel = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteChannel(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-channels"] }),
    });
};

// ── Workflows ────────────────────────────────────────────────────

export const useWorkflows = () =>
    useQuery({ queryKey: ["notif-workflows"], queryFn: fetchWorkflows });

export const useCreateWorkflow = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: WorkflowCreate) => createWorkflow(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-workflows"] }),
    });
};

export const useUpdateWorkflowStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateWorkflowStatus(id, status),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-workflows"] }),
    });
};

export const useTriggerWorkflow = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload, approverEmail }: { id: string; payload: NotificationPayload; approverEmail?: string }) =>
            triggerWorkflow(id, payload, approverEmail),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notif-notifications"] });
            qc.invalidateQueries({ queryKey: ["notif-approvals"] });
        },
    });
};

// ── Notifications ────────────────────────────────────────────────

export const useNotifications = (status?: string) =>
    useQuery({
        queryKey: ["notif-notifications", status],
        queryFn: () => fetchNotifications(status),
        refetchInterval: 5000,
    });

export const useSendNotification = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ channelId, payload, workflowId }: { channelId: string; payload: NotificationPayload; workflowId?: string }) =>
            sendNotification(channelId, payload, workflowId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-notifications"] }),
    });
};

// ── Approvals ────────────────────────────────────────────────────

export const useApprovals = (status?: string) =>
    useQuery({
        queryKey: ["notif-approvals", status],
        queryFn: () => fetchApprovals(status),
        refetchInterval: 5000,
    });

export const useRespondToApproval = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
            respondToApproval(id, decision),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-approvals"] }),
    });
};
