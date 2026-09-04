namespace BarberAppointment.Core.Enums;

public enum UserRole : byte
{
    Customer = 1,
    Admin = 2,
    Employee = 3
}

public static class Roles
{
    public const string Customer = "Customer";
    public const string Admin = "Admin";
    public const string Employee = "Employee";
    public const string Staff = "Employee";
}
