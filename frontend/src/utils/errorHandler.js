/**
 * Utility function to extract and format error messages from API responses
 * @param {Error} err - The error object from axios/API call
 * @param {string} defaultMessage - Default message if error cannot be parsed
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (err, defaultMessage = "An error occurred. Please try again.") => {
    // Network error (no response from server)
    if (!err.response) {
        if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
            return "Network error: Unable to connect to the server. Please check your internet connection.";
        }
        if (err.code === "ECONNABORTED") {
            return "Request timeout: The server took too long to respond. Please try again.";
        }
        return `Connection error: ${err.message || defaultMessage}`;
    }

    const status = err.response?.status;
    const data = err.response?.data;

    // Try to extract error message from various possible locations in the response
    let errorMessage = 
        data?.data?.message ||
        data?.error?.message ||
        data?.message ||
        data?.error ||
        data?.data?.error ||
        "";

    // If we have a status code but no message, provide status-specific messages
    if (!errorMessage && status) {
        switch (status) {
            case 400:
                return "Bad request: Invalid data provided. Please check your input.";
            case 401:
                return "Unauthorized: Please login to continue.";
            case 403:
                return "Forbidden: You don't have permission to perform this action.";
            case 404:
                return "Not found: The requested resource was not found.";
            case 409:
                return "Conflict: This resource already exists.";
            case 422:
                return "Validation error: Please check your input data.";
            case 500:
                return "Server error: Something went wrong on our end. Please try again later.";
            case 503:
                return "Service unavailable: The server is temporarily unavailable. Please try again later.";
            default:
                return `Error ${status}: ${defaultMessage}`;
        }
    }

    // If we have an error message, return it
    if (errorMessage) {
        // Clean up common backend error messages
        if (errorMessage.includes("username already taken")) {
            return "This username is already taken. Please choose a different username.";
        }
        if (errorMessage.includes("email already taken")) {
            return "This email is already registered. Please use a different email or try logging in.";
        }
        if (errorMessage.includes("Password and confirm password do not match")) {
            return "Password and confirm password do not match. Please make sure they are the same.";
        }
        if (errorMessage.includes("Kullanıcı bulunamadı") || errorMessage.includes("User not found")) {
            return "User not found: The email or username you entered is not registered.";
        }
        if (errorMessage.includes("Bad credentials") || errorMessage.includes("Invalid credentials")) {
            return "Invalid credentials: The email/username or password is incorrect.";
        }
        if (errorMessage.includes("Unexpected error")) {
            return "An unexpected error occurred. Please try again or contact support.";
        }
        
        return errorMessage;
    }

    // Fallback to default message
    return defaultMessage;
};

/**
 * Get a specific error message for login errors
 */
export const getLoginErrorMessage = (err) => {
    if (!err.response) {
        return getErrorMessage(err, "Unable to connect to the server. Please check your internet connection.");
    }

    const status = err.response?.status;
    const errorMessage = getErrorMessage(err, "Login failed. Please try again.");

    // Specific handling for authentication errors
    if (status === 401 || status === 403) {
        const data = err.response?.data;
        const message = 
            data?.data?.message ||
            data?.error?.message ||
            data?.message ||
            "";
        
        if (message.includes("Bad credentials") || 
            message.includes("Invalid credentials") || 
            message.includes("Kullanıcı bulunamadı") ||
            message.includes("User not found")) {
            return "Email/username or password is incorrect. Please check your credentials and try again.";
        }
        
        return "Authentication failed: Email/username or password is incorrect.";
    }

    return errorMessage;
};

/**
 * Get a specific error message for registration errors
 */
export const getRegisterErrorMessage = (err) => {
    if (!err.response) {
        return getErrorMessage(err, "Unable to connect to the server. Please check your internet connection.");
    }

    const status = err.response?.status;
    const errorMessage = getErrorMessage(err, "Registration failed. Please try again.");

    // Specific handling for registration errors
    if (status === 403 || status === 409) {
        const data = err.response?.data;
        const message = 
            data?.data?.message ||
            data?.error?.message ||
            data?.message ||
            "";
        
        if (message.includes("username already taken")) {
            return "This username is already taken. Please choose a different username.";
        }
        if (message.includes("email already taken")) {
            return "This email is already registered. Please use a different email or try logging in.";
        }
    }

    if (status === 400) {
        const data = err.response?.data;
        const message = 
            data?.data?.message ||
            data?.error?.message ||
            data?.message ||
            "";
        
        if (message.includes("Password and confirm password do not match")) {
            return "Password and confirm password do not match. Please make sure they are the same.";
        }
        if (message.includes("validation") || message.includes("Validation")) {
            return "Please fill in all required fields correctly.";
        }
    }

    return errorMessage;
};

