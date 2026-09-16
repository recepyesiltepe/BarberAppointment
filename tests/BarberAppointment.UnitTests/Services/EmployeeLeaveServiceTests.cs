using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.Services;

public class EmployeeLeaveServiceTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IEmployeeLeaveRequestRepository> _leaveRepoMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<ILogger<EmployeeLeaveService>> _loggerMock;
    private readonly EmployeeLeaveService _sut;

    public EmployeeLeaveServiceTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _leaveRepoMock = new Mock<IEmployeeLeaveRequestRepository>();
        _employeeRepoMock = new Mock<IEmployeeRepository>();
        _loggerMock = new Mock<ILogger<EmployeeLeaveService>>();

        _unitOfWorkMock.Setup(u => u.EmployeeLeaves).Returns(_leaveRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Employees).Returns(_employeeRepoMock.Object);

        _sut = new EmployeeLeaveService(_unitOfWorkMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WhenStartDateIsAfterEndDate_ThrowsBusinessException()
    {
        // Arrange
        var dto = new CreateLeaveRequestDto
        {
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(1),
            Reason = "Tatil"
        };

        // Act
        Func<Task> act = () => _sut.CreateAsync(dto, 1, false);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*başlangıç tarihinden sonra olmalıdır*");
    }

    [Fact]
    public async Task CreateAsync_WhenEndDateIsInPast_ThrowsBusinessException()
    {
        // Arrange
        var dto = new CreateLeaveRequestDto
        {
            StartDate = DateTime.UtcNow.AddDays(-5),
            EndDate = DateTime.UtcNow.AddDays(-4),
            Reason = "Geçmiş izin"
        };

        // Act
        Func<Task> act = () => _sut.CreateAsync(dto, 1, false);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*Geçmiş bir zaman*");
    }

    [Fact]
    public async Task CreateAsync_WhenHasApprovedConflict_ThrowsBusinessException()
    {
        // Arrange
        var employee = new Employee { Id = 5, UserId = 10, FullName = "Test Personel", IsActive = true };
        _employeeRepoMock.Setup(e => e.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Employee> { employee });

        _leaveRepoMock.Setup(l => l.HasApprovedLeaveConflictAsync(5, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var dto = new CreateLeaveRequestDto
        {
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3),
            Reason = "Doktor randevusu"
        };

        // Act
        Func<Task> act = () => _sut.CreateAsync(dto, 10, false);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*zaten onaylanmış bir izni bulunmaktadır*");
    }

    [Fact]
    public async Task ApproveAsync_WhenPending_SetsStatusToApproved()
    {
        // Arrange
        var leave = new EmployeeLeaveRequest
        {
            Id = 1,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Pending,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3)
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        var result = await _sut.ApproveAsync(1, 99, "İyi tatiller");

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(LeaveRequestStatus.Approved);
        result.StatusName.Should().Be("Onaylandı");
        result.AdminNote.Should().Be("İyi tatiller");
        result.ReviewedByUserId.Should().Be(99);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RejectAsync_WhenPending_SetsStatusToRejected()
    {
        // Arrange
        var leave = new EmployeeLeaveRequest
        {
            Id = 2,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Pending,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3)
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        var result = await _sut.RejectAsync(2, 99, "Yoğun gün");

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(LeaveRequestStatus.Rejected);
        result.StatusName.Should().Be("Reddedildi");
        result.AdminNote.Should().Be("Yoğun gün");
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_WhenPending_SetsStatusToCancelled()
    {
        // Arrange
        var employee = new Employee { Id = 5, UserId = 10, FullName = "Test Personel", IsActive = true };
        _employeeRepoMock.Setup(e => e.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Employee> { employee });

        var leave = new EmployeeLeaveRequest
        {
            Id = 3,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Pending,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3)
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        await _sut.CancelAsync(3, 10, false);

        // Assert
        leave.Status.Should().Be(LeaveRequestStatus.Cancelled);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_WhenAdminCancelsApprovedLeave_SetsStatusToCancelled()
    {
        // Arrange
        var leave = new EmployeeLeaveRequest
        {
            Id = 4,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Approved,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3),
            AdminNote = "Önceki onay notu"
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        await _sut.CancelAsync(4, 99, true, "Personel göreve geri çağrıldı");

        // Assert
        leave.Status.Should().Be(LeaveRequestStatus.Cancelled);
        leave.AdminNote.Should().Contain("Personel göreve geri çağrıldı");
        leave.ReviewedByUserId.Should().Be(99);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_WhenEmployeeAttemptsToCancelApprovedLeave_ThrowsBusinessException()
    {
        // Arrange
        var employee = new Employee { Id = 5, UserId = 10, FullName = "Test Personel", IsActive = true };
        _employeeRepoMock.Setup(e => e.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Employee> { employee });

        var leave = new EmployeeLeaveRequest
        {
            Id = 5,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Approved,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3)
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        Func<Task> act = () => _sut.CancelAsync(5, 10, false);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*yalnızca yönetici tarafından iptal edilebilir*");
    }

    [Fact]
    public async Task CancelAsync_WhenAlreadyCancelled_ThrowsBusinessException()
    {
        // Arrange
        var leave = new EmployeeLeaveRequest
        {
            Id = 6,
            EmployeeId = 5,
            Status = LeaveRequestStatus.Cancelled,
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(3)
        };

        _leaveRepoMock.Setup(l => l.GetByIdWithDetailsAsync(6, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leave);

        // Act
        Func<Task> act = () => _sut.CancelAsync(6, 99, true);

        // Assert
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*Yalnızca 'Beklemede' veya 'Onaylandı' durumundaki izinler iptal edilebilir*");
    }
}

