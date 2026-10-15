
import api from "./api";

const dashboardService = {
  async getOverview() {
    const response = await api.get("/dashboard/overview");
    return response.data.data;
  },
};

export default dashboardService;
