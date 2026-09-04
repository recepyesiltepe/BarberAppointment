using BarberAppointment.SolidExamples.Dip;
using BarberAppointment.SolidExamples.Isp;
using BarberAppointment.SolidExamples.Lsp;
using BarberAppointment.SolidExamples.Ocp;
using BarberAppointment.SolidExamples.Srp;

Console.WriteLine("=== S — Single Responsibility ===");
SrpDemo.Run();

Console.WriteLine();
Console.WriteLine("=== O — Open/Closed ===");
OcpDemo.Run();

Console.WriteLine();
Console.WriteLine("=== L — Liskov Substitution ===");
LspDemo.Run();

Console.WriteLine();
Console.WriteLine("=== I — Interface Segregation ===");
IspDemo.Run();

Console.WriteLine();
Console.WriteLine("=== D — Dependency Inversion ===");
DipDemo.Run();
