import client from './client';

export const servicesApi = {
  getAll: async (activeOnly = false) => {
    return await client.get(`/api/services?activeOnly=${activeOnly}`);
  },
  getById: async (id) => {
    return await client.get(`/api/services/${id}`);
  },
  create: async (data) => {
    return await client.post('/api/services', data);
  },
  update: async (id, data) => {
    return await client.put(`/api/services/${id}`, data);
  },
  delete: async (id) => {
    return await client.delete(`/api/services/${id}`);
  }
};

export const employeesApi = {
  getAll: async (activeOnly = false) => {
    return await client.get(`/api/employees?activeOnly=${activeOnly}`);
  },
  getById: async (id) => {
    return await client.get(`/api/employees/${id}`);
  },
  getByService: async (serviceId) => {
    return await client.get(`/api/employees/by-service/${serviceId}`);
  },
  create: async (data) => {
    return await client.post('/api/employees', data);
  },
  update: async (id, data) => {
    return await client.put(`/api/employees/${id}`, data);
  },
  assignServices: async (id, serviceIds) => {
    return await client.post(`/api/employees/${id}/services`, { serviceIds });
  },
  delete: async (id) => {
    return await client.delete(`/api/employees/${id}`);
  }
};

export const appointmentsApi = {
  getAll: async () => {
    return await client.get('/api/appointments');
  },
  getMy: async () => {
    return await client.get('/api/appointments/my');
  },
  getFiltered: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.userId) query.append('userId', params.userId);
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    return await client.get(`/api/appointments/filter?${query.toString()}`);
  },
  getById: async (id) => {
    return await client.get(`/api/appointments/${id}`);
  },
  getByUser: async (userId) => {
    return await client.get(`/api/appointments/user/${userId}`);
  },
  getAvailableSlots: async (employeeId, serviceId, date) => {
    return await client.get(`/api/appointments/available-slots?employeeId=${employeeId}&serviceId=${serviceId}&date=${date}`);
  },
  create: async (data) => {
    return await client.post('/api/appointments', data);
  },
  reschedule: async (id, data) => {
    return await client.put(`/api/appointments/${id}/reschedule`, data);
  },
  cancel: async (id) => {
    return await client.put(`/api/appointments/${id}/cancel`);
  },
  complete: async (id) => {
    return await client.put(`/api/appointments/${id}/complete`);
  }
};

export const usersApi = {
  getAll: async () => {
    return await client.get('/api/users');
  },
  getById: async (id) => {
    return await client.get(`/api/users/${id}`);
  }
};
