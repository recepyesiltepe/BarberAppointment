import client from './client';

export const leaveApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.status !== undefined && params.status !== '') query.append('status', params.status);
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
    const queryString = query.toString();
    return await client.get(`/api/employee-leaves${queryString ? `?${queryString}` : ''}`);
  },

  getMyLeaves: async () => {
    return await client.get('/api/employee-leaves/my-leaves');
  },

  getById: async (id) => {
    return await client.get(`/api/employee-leaves/${id}`);
  },

  create: async (data) => {
    return await client.post('/api/employee-leaves', data);
  },

  approve: async (id, adminNote = null) => {
    return await client.put(`/api/employee-leaves/${id}/approve`, { adminNote });
  },

  reject: async (id, adminNote = null) => {
    return await client.put(`/api/employee-leaves/${id}/reject`, { adminNote });
  },

  cancel: async (id, reason = null) => {
    return await client.put(`/api/employee-leaves/${id}/cancel`, reason ? { reason } : {});
  }
};

