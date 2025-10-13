// src/api/authApi.js
import api from "./api";

/**
 * Register a new user
 * @param {Object} userData - { name, email, password, role }
 * @returns {Promise<Object>} user object with optional token
 */
export const registerUser = async (userData) => {
  try {
    const response = await api.post("/api/auth/register", userData);
    return response.data;       
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};
