
import api from "./api";

const authService = {
  async login(credentials) {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async register(companyData) {
    const response = await api.post("/auth/register", companyData);
    return response.data;
  },
};

export default authService;
