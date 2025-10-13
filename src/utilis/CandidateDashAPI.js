import api from "./api"; // Reference your centralized Axios instance

// Fetch candidate dashboard
export const fetchCandidateDashboard = async () => {
  try {
    const response = await api.get("/api/dashboard/me"); // JWT automatically added by interceptor
    return response.data; // CandidateDashboardDTO from backend
  } catch (error) {
    console.error("Error fetching candidate dashboard:", error);
    throw error;
  }
};
