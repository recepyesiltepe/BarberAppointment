using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.Services;

public class AppointmentReminderProcessorTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<ISmsService> _smsServiceMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<ILogger<AppointmentReminderProcessor>> _loggerMock;

    private readonly AppointmentReminderProcessor _sut;
    private readonly DateTime _turkeyNow = new(2026, 9, 17, 10, 0, 0);

    public AppointmentReminderProcessorTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _appointmentRepoMock = new Mock<IAppointmentRepository>();
        _emailServiceMock = new Mock<IEmailService>();
        _smsServiceMock = new Mock<ISmsService>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _loggerMock = new Mock<ILogger<AppointmentReminderProcessor>>();

        _unitOfWorkMock.Setup(u => u.Appointments).Returns(_appointmentRepoMock.Object);

        _dateTimeProviderMock.Setup(d => d.TurkeyNow).Returns(_turkeyNow);
        _dateTimeProviderMock.Setup(d => d.UtcNow).Returns(_turkeyNow.AddHours(-3));

        _sut = new AppointmentReminderProcessor(
            _unitOfWorkMock.Object,
            _emailServiceMock.Object,
            _smsServiceMock.Object,
            _dateTimeProviderMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task ProcessPendingRemindersAsync_WhenNoAppointments_ReturnsZero()
    {
        // Arrange
        _appointmentRepoMock
            .Setup(r => r.GetPendingRemindersAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Appointment>());

        // Act
        var result = await _sut.ProcessPendingRemindersAsync();

        // Assert
        Assert.Equal(0, result);
        _emailServiceMock.Verify(e => e.SendAppointmentReminderAsync(It.IsAny<AppointmentDto>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _smsServiceMock.Verify(s => s.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ProcessPendingRemindersAsync_QueriesWithTurkeyNowAndWindowEnd()
    {
        // Arrange
        DateTime capturedStart = default;
        DateTime capturedEnd = default;

        _appointmentRepoMock
            .Setup(r => r.GetPendingRemindersAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .Callback<DateTime, DateTime, CancellationToken>((start, end, _) =>
            {
                capturedStart = start;
                capturedEnd = end;
            })
            .ReturnsAsync(new List<Appointment>());

        // Act
        await _sut.ProcessPendingRemindersAsync();

        // Assert
        Assert.Equal(_turkeyNow, capturedStart);
        Assert.Equal(_turkeyNow.AddHours(24), capturedEnd);
    }

    [Fact]
    public async Task ProcessPendingRemindersAsync_WhenPendingAppointmentsExist_SendsEmailAndSmsAndUpdates()
    {
        // Arrange
        var appt = new Appointment
        {
            Id = 101,
            UserId = 5,
            EmployeeId = 2,
            ServiceId = 1,
            StartAt = _turkeyNow.AddHours(4),
            EndAt = _turkeyNow.AddHours(4).AddMinutes(45),
            Status = AppointmentStatus.Confirmed,
            IsReminderSent = false,
            User = new User
            {
                Id = 5,
                FullName = "Ahmet Yılmaz",
                Email = "ahmet@example.com",
                Phone = "05551112233"
            },
            Employee = new Employee
            {
                Id = 2,
                FullName = "Mehmet Usta"
            },
            Service = new Service
            {
                Id = 1,
                Name = "Saç Kesimi",
                Price = 250,
                DurationMinutes = 45
            }
        };

        _appointmentRepoMock
            .Setup(r => r.GetPendingRemindersAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Appointment> { appt });

        // Act
        var result = await _sut.ProcessPendingRemindersAsync();

        // Assert
        Assert.Equal(1, result);
        Assert.True(appt.IsReminderSent);
        Assert.Equal(_turkeyNow, appt.ReminderSentAt);

        _emailServiceMock.Verify(e => e.SendAppointmentReminderAsync(
            It.Is<AppointmentDto>(d => d.Id == 101 && d.CustomerName == "Ahmet Yılmaz"),
            "ahmet@example.com",
            It.IsAny<CancellationToken>()), Times.Once);

        _smsServiceMock.Verify(s => s.SendSmsAsync(
            "05551112233",
            It.Is<string>(msg => msg.Contains("101") && msg.Contains("Saç Kesimi")),
            It.IsAny<CancellationToken>()), Times.Once);

        _appointmentRepoMock.Verify(r => r.Update(appt), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessPendingRemindersAsync_WhenOneFails_ContinuesProcessingOthers()
    {
        // Arrange
        var appt1 = new Appointment
        {
            Id = 101,
            UserId = 1,
            StartAt = _turkeyNow.AddHours(2),
            IsReminderSent = false,
            User = new User { Id = 1, FullName = "Hatalı Kullanıcı", Email = "error@example.com" }
        };

        var appt2 = new Appointment
        {
            Id = 102,
            UserId = 2,
            StartAt = _turkeyNow.AddHours(5),
            IsReminderSent = false,
            User = new User { Id = 2, FullName = "Başarılı Kullanıcı", Email = "success@example.com" }
        };

        _appointmentRepoMock
            .Setup(r => r.GetPendingRemindersAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Appointment> { appt1, appt2 });

        _emailServiceMock
            .Setup(e => e.SendAppointmentReminderAsync(It.Is<AppointmentDto>(d => d.Id == 101), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("SMTP connection failed"));

        _emailServiceMock
            .Setup(e => e.SendAppointmentReminderAsync(It.Is<AppointmentDto>(d => d.Id == 102), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ProcessPendingRemindersAsync();

        // Assert
        Assert.Equal(1, result);
        Assert.False(appt1.IsReminderSent);
        Assert.True(appt2.IsReminderSent);
    }
}

