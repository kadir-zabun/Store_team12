import axiosClient from "./axiosClient";

const supportApi = {
    // Customer/Guest endpoints
    startConversation: (guestToken = null) => {
        const config = {
            params: guestToken ? { guestToken } : {},
        };
        // Remove Content-Type header for this request since backend expects query params only
        config.headers = { "Content-Type": "" };
        return axiosClient.post("/api/support/conversations/start", null, config);
    },

    getMessages: (conversationId, guestToken = null) =>
        axiosClient.get(`/api/support/conversations/${conversationId}/messages`, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
        }),

    sendText: (conversationId, text, guestToken = null) => {
        const formData = new FormData();
        formData.append("text", text);
        const headers = {};
        if (guestToken) {
            headers["X-Guest-Token"] = guestToken;
        }
        // Remove Content-Type header to let axios set it automatically for FormData
        headers["Content-Type"] = undefined;
        return axiosClient.post(`/api/support/conversations/${conversationId}/messages`, formData, {
            headers,
        });
    },

    uploadAttachment: (conversationId, file, guestToken = null) => {
        const formData = new FormData();
        formData.append("file", file);
        const headers = {};
        if (guestToken) {
            headers["X-Guest-Token"] = guestToken;
        }
        // Remove Content-Type header to let axios set it automatically for FormData
        headers["Content-Type"] = undefined;
        return axiosClient.post(`/api/support/conversations/${conversationId}/attachments`, formData, {
            headers,
        });
    },

    getAttachment: (attachmentId, guestToken = null) =>
        axiosClient.get(`/api/support/attachments/${attachmentId}`, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
            responseType: "blob",
        }),

    customerCloseConversation: (conversationId, guestToken = null) =>
        axiosClient.post(`/api/support/conversations/${conversationId}/close`, null, {
            headers: guestToken ? { "X-Guest-Token": guestToken } : {},
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
        // Remove Content-Type header to let axios set it automatically for FormData
        return axiosClient.post(`/api/support/agent/conversations/${conversationId}/messages`, formData, {
            headers: {
                "Content-Type": undefined,
            },
        });
    },

    agentUploadAttachment: (conversationId, file) => {
        const formData = new FormData();
        formData.append("file", file);
        // Remove Content-Type header to let axios set it automatically for FormData
        return axiosClient.post(`/api/support/agent/conversations/${conversationId}/attachments`, formData, {
            headers: {
                "Content-Type": undefined,
            },
        });
    },

    getAttachment: (attachmentId) =>
        axiosClient.get(`/api/support/agent/attachments/${attachmentId}`, {
            responseType: "blob",
        }),

    getCustomerDetails: (conversationId) =>
        axiosClient.get(`/api/support/agent/conversations/${conversationId}/context`),
};

export default supportApi;

