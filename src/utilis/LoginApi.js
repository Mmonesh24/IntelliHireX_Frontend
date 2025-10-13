// src/api/authApi.js
import api from "./api";

/**
 * Login a user (candidate or interviewer)
 * @param {Object} credentials - { email, password, userType, role }
 * @returns {Promise<Object>} user object with JWT token
 */
export const loginUser = async ({ email, password, userType }) => {
  try {
    const response = await api.post("/api/auth/login", {
      email,
      password,
      userType   // role for interviewer (optional for candidate)
    });

    return response.data;
  } catch (error) {
    // Return backend error message if available
    throw error.response?.data || { message: error.message };
  }
};
