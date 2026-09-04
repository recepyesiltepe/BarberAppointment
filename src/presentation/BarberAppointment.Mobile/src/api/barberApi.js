import client from './client';

export const authApi = {
  login: async (credentials) => {
    return await client.post('/api/auth/login', credentials);
  },
  register: async (userData) => {
    return await client.post('/api/auth/register', userData);
  },
  getProfile: async () => {
    return await client.get('/api/auth/me');
  }
};

export const barberApi = {
  getServices: async () => {
    return await client.get('/api/services?activeOnly=true');
  },
  getEmployees: async () => {
    return await client.get('/api/employees?activeOnly=true');
  },
  getEmployeesByService: async (serviceId) => {
    return await client.get(`/api/employees/by-service/${serviceId}`);
  },
  getAvailableSlots: async (employeeId, serviceId, date) => {
    return await client.get(`/api/appointments/available-slots?employeeId=${employeeId}&serviceId=${serviceId}&date=${date}`);
  },
  getMyAppointments: async (userId) => {
    return await client.get('/api/appointments/my');
  },
  createAppointment: async (data) => {
    return await client.post('/api/appointments', data);
  },
  cancelAppointment: async (id) => {
    return await client.put(`/api/appointments/${id}/cancel`);
  }
};

export const smsApi = {
  sendCode: async (phoneNumber) => {
    return await client.post('/api/sms/send-code', { phoneNumber });
  },
  verifyCode: async (phoneNumber, code) => {
    return await client.post('/api/sms/verify-code', { phoneNumber, code });
  },
  getStatus: async (phoneNumber) => {
    return await client.get(`/api/sms/status?phoneNumber=${encodeURIComponent(phoneNumber)}`);
  },
  verifyMyPhone: async (phoneNumber, code) => {
    return await client.post('/api/sms/verify-my-phone', { phoneNumber, code });
  }
};
