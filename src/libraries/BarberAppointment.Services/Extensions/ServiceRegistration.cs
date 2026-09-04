using BarberAppointment.Core.Time;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;
using BarberAppointment.Services.Security;
using BarberAppointment.Services.Validators;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BarberAppointment.Services.Extensions;

public static class ServiceRegistration
{
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        // Core & Policy Services
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddSingleton<IWorkHoursPolicy, DefaultWorkHoursPolicy>();

        // Security Services
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();

        // Business Services
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IServiceManagementService, ServiceManagementService>();
        services.AddScoped<IUserService, UserService>();

        // FluentValidation Validators
        services.AddValidatorsFromAssemblyContaining<CreateAppointmentValidator>();

        return services;
    }
}
