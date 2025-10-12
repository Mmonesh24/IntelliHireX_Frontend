// src/api/authApi.js
import api from "./api";

export const loginUser = async (email, password) => {
  try {
    const data = await api.post("/api/auth/login", { email, password });
    
    return data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};
