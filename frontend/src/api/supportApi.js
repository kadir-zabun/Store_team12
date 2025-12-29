import axiosClient from "./axiosClient";

const supportApi = {
    // Customer/Guest endpoints
    startConversation: (guestToken = null) =>
        axiosClient.post("/api/support/conversations/start", null, {
            params: guestToken ? { guestToken } : {},
        }),

    getMessages: (conversationId, guestToken = null) =>
        axiosClient.get(`/api/support/conversations/${conversationId}/messages`, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
        }),

    sendText: (conversationId, text, guestToken = null) => {
        const formData = new FormData();
        formData.append("text", text);
        return axiosClient.post(`/api/support/conversations/${conversationId}/messages`, formData, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
        });
    },

    uploadAttachment: (conversationId, file, guestToken = null) => {
        const formData = new FormData();
        formData.append("file", file);
        return axiosClient.post(`/api/support/conversations/${conversationId}/attachments`, formData, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
        });
    },

    getAttachment: (attachmentId, guestToken = null) =>
        axiosClient.get(`/api/support/attachments/${attachmentId}`, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
            responseType: "blob",
        }),

    // Support Agent endpoints
    getQueue: (status = null) =>
        axiosClient.get("/api/support/agent/queue", {
            params: status ? { status } : {},
        }),

    claimConversation: (conversationId) =>
        axiosClient.post(`/api/support/agent/conversations/${conversationId}/claim`),

    closeConversation: (conversationId) =>
        axiosClient.post(`/api/support/agent/conversations/${conversationId}/close`),

    agentGetMessages: (conversationId) =>
        axiosClient.get(`/api/support/agent/conversations/${conversationId}/messages`),

    agentSendText: (conversationId, text) => {
        const formData = new FormData();
        formData.append("text", text);
        return axiosClient.post(`/api/support/agent/conversations/${conversationId}/messages`, formData);
    },

    agentUploadAttachment: (conversationId, file) => {
        const formData = new FormData();
        formData.append("file", file);
        return axiosClient.post(`/api/support/agent/conversations/${conversationId}/attachments`, formData);
    },

    getAttachment: (attachmentId) =>
        axiosClient.get(`/api/support/agent/attachments/${attachmentId}`, {
            responseType: "blob",
        }),

    getCustomerDetails: (conversationId) =>
        axiosClient.get(`/api/support/agent/conversations/${conversationId}/context`),
};

export default supportApi;

