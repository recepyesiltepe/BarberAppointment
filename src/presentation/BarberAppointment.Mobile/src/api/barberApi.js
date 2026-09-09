import client from './client';

export const authApi = {
  login: async (credentials) => {
    return await client.post('/api/auth/login', credentials);
  },
  register: async (userData) => {
    return await client.post('/api/auth/register', userData);
  },
  verifyEmail: async (data) => {
    return await client.post('/api/auth/verify-email', data);
  },
  resendVerificationEmail: async (email) => {
    return await client.post('/api/auth/resend-verification-email', { email });
  },
  getProfile: async () => {
    return await client.get('/api/auth/me');
  },
  updateProfile: async (userData) => {
    return await client.put('/api/auth/me', userData);
  },
  changePassword: async (passwordData) => {
    return await client.put('/api/auth/change-password', passwordData);
  },
  confirmPasswordChange: async (data) => {
    return await client.put('/api/auth/change-password/confirm', data);
  },
  forgotPassword: async (email) => {
    return await client.post('/api/auth/forgot-password', { email });
  },
  resetPassword: async (resetData) => {
    return await client.post('/api/auth/reset-password', resetData);
  }
};

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
  getAvailableSlots: async (employeeId, serviceId, date) => {
    return await client.get(`/api/appointments/available-slots?employeeId=${employeeId}&serviceId=${serviceId}&date=${date}`);
  },
  create: async (data) => {
    return await client.post('/api/appointments', data);
  },
  complete: async (id) => {
    return await client.put(`/api/appointments/${id}/complete`);
  },
  cancel: async (id) => {
    return await client.put(`/api/appointments/${id}/cancel`);
  }
};

export const statsApi = {
  getSummary: async () => {
    const [apptRes, srvRes, empRes] = await Promise.all([
      appointmentsApi.getAll().catch(() => ({ success: false, data: [] })),
      servicesApi.getAll(false).catch(() => ({ success: false, data: [] })),
      employeesApi.getAll(false).catch(() => ({ success: false, data: [] }))
    ]);

    const appointments = apptRes.data?.items || (Array.isArray(apptRes.data) ? apptRes.data : []);
    const services = Array.isArray(srvRes.data) ? srvRes.data : [];
    const employees = Array.isArray(empRes.data) ? empRes.data : [];

    const totalAppointments = appointments.length;

    const activeAppointments = appointments.filter((a) => {
      const s = Number(a.status);
      return s === 1 || s === 2 || a.status === 'Pending' || a.status === 'Confirmed';
    }).length;

    const completedAppointments = appointments.filter((a) => {
      const s = Number(a.status);
      return s === 3 || a.status === 'Completed';
    }).length;

    const cancelledAppointments = appointments.filter((a) => {
      const s = Number(a.status);
      return s === 4 || a.status === 'Cancelled';
    }).length;

    // Web ile 1'e 1 aynı: İptal edilen randevular KESİNLİKLE dahil edilmez
    const validRevenueAppointments = appointments.filter((a) => {
      const s = Number(a.status);
      const isCancelled = s === 4 || a.status === 'Cancelled';
      const isValid = s === 1 || s === 2 || s === 3 || a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'Completed';
      return !isCancelled && isValid;
    });

    const totalRevenue = validRevenueAppointments.reduce((sum, a) => {
      const priceVal = Number(a.price) || Number(a.service?.price) || 0;
      return sum + priceVal;
    }, 0);

    const activeEmployees = employees.filter((e) => e.isActive).length;
    const activeServices = services.filter((s) => s.isActive).length;

    return {
      totalAppointments,
      activeAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      activeEmployees,
      activeServices
    };
  }
};

// Geriye dönük uyumluluk için barberApi alias'ı korunuyor
export const barberApi = {
  getServices: servicesApi.getAll,
  getEmployees: employeesApi.getAll,
  getEmployeesByService: employeesApi.getByService,
  getAvailableSlots: appointmentsApi.getAvailableSlots,
  getMyAppointments: appointmentsApi.getMy,
  getAllAppointments: appointmentsApi.getAll,
  createAppointment: appointmentsApi.create,
  completeAppointment: appointmentsApi.complete,
  cancelAppointment: appointmentsApi.cancel
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
  },
  verifyAndBook: async (phoneNumber, code, appointment) => {
    return await client.post('/api/sms/verify-and-book', { phoneNumber, code, appointment });
  }
};
