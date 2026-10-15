import api from "./api";

const leadService = {
  getLeads: async (params = {}) => {
    const response = await api.get("/leads", { params });
    return response.data;
  },

  getLeadById: async (id) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  createLead: async (leadData) => {
    const response = await api.post("/leads", leadData);
    return response.data;
  },

  updateLead: async (id, leadData) => {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  convertLead: async (id) => {
    const response = await api.post(`/leads/${id}/convert`);
    return response.data;
  },

  deleteLead: async (id) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },
};

export default leadService;