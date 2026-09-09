using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Results;
using BarberAppointment.Core.Time;
using BarberAppointment.Data.Context;
using BarberAppointment.Data.Repositories.Implementations;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using BarberAppointment.Services.Interfaces;
using BarberAppointment.Services.Policies;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.Services;

public class AppointmentPaginationFilterTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly IWorkHoursPolicy _workHoursPolicy;
    private readonly AppointmentService _appointmentService;

    public AppointmentPaginationFilterTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _appointmentRepoMock = new Mock<IAppointmentRepository>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _emailServiceMock = new Mock<IEmailService>();
        _workHoursPolicy = new DefaultWorkHoursPolicy();

        _unitOfWorkMock.Setup(u => u.Appointments).Returns(_appointmentRepoMock.Object);

        _appointmentService = new AppointmentService(
            _unitOfWorkMock.Object,
            _workHoursPolicy,
            _dateTimeProviderMock.Object,
            _emailServiceMock.Object);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PagedResult Meta Veri Hesaplama Testi (TotalPages, HasPrevious, HasNext)
    // ─────────────────────────────────────────────────────────────────────────
    [Theory]
    [InlineData(25, 10, 1, 3, false, true)]   // 25 kayıt, 10'arlı sayfa -> 3 sayfa, Sayfa 1: önceki yok, sonraki var
    [InlineData(25, 10, 2, 3, true, true)]    // Sayfa 2: önceki var, sonraki var
    [InlineData(25, 10, 3, 3, true, false)]   // Sayfa 3 (son): önceki var, sonraki yok
    [InlineData(0, 10, 1, 0, false, false)]   // 0 kayıt -> 0 sayfa
    [InlineData(10, 10, 1, 1, false, false)]  // 10 kayıt -> 1 sayfa
    public void PagedResult_CalculatesTotalPagesAndNavigationFlagsCorrectly(
        int totalCount, int pageSize, int pageNumber, int expectedTotalPages, bool expectedHasPrev, bool expectedHasNext)
    {
        // Act
        var result = new PagedResult<string>(Array.Empty<string>(), totalCount, pageNumber, pageSize);

        // Assert
        result.TotalCount.Should().Be(totalCount);
        result.PageSize.Should().Be(pageSize);
        result.PageNumber.Should().Be(pageNumber);
        result.TotalPages.Should().Be(expectedTotalPages);
        result.HasPreviousPage.Should().Be(expectedHasPrev);
        result.HasNextPage.Should().Be(expectedHasNext);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Servis Seviyesinde Sayfalama ve Meta Veri Doğrulaması
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task GetPagedAsync_WithPageAndPageSize_ReturnsCorrectPagedResultWithTotalCountAndTotalPages()
    {
        // Arrange
        var filter = new AppointmentFilterDto { PageNumber = 2, PageSize = 5 };

        var fakeAppointments = new List<Appointment>
        {
            new() { Id = 6, UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = DateTime.UtcNow.AddDays(1), Status = AppointmentStatus.Confirmed,
                    User = new User { FullName = "Ali Yılmaz" }, Employee = new Employee { FullName = "Usta Berber" }, Service = new Service { Name = "Kesim" } },
            new() { Id = 7, UserId = 2, EmployeeId = 1, ServiceId = 1, StartAt = DateTime.UtcNow.AddDays(1).AddHours(1), Status = AppointmentStatus.Confirmed,
                    User = new User { FullName = "Veli Kaya" }, Employee = new Employee { FullName = "Usta Berber" }, Service = new Service { Name = "Kesim" } }
        };

        _appointmentRepoMock.Setup(r => r.GetPagedAsync(
            filter.EmployeeId,
            filter.UserId,
            filter.Status,
            filter.StartDate,
            filter.EndDate,
            filter.Search,
            2,
            5,
            It.IsAny<CancellationToken>()))
        .ReturnsAsync((fakeAppointments, 17)); // Toplam 17 kayıt var, 2. sayfada 2 kayıt dönüyor

        // Act
        var result = await _appointmentService.GetPagedAsync(filter);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(17);
        result.PageNumber.Should().Be(2);
        result.PageSize.Should().Be(5);
        result.TotalPages.Should().Be(4); // 17 / 5 = 3.4 -> 4 sayfa
        result.HasPreviousPage.Should().BeTrue();
        result.HasNextPage.Should().BeTrue();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Repository Seviyesinde InMemory Dinamik Filtreleme, Arama ve Sayfalama Testi
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task AppointmentRepository_GetPagedAsync_FiltersSearchesAndPagesCorrectly()
    {
        // Arrange: InMemory AppDbContext
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var user1 = new User { Id = 1, FullName = "Ahmet Yılmaz", Email = "ahmet@test.com", Phone = "05551112233" };
        var user2 = new User { Id = 2, FullName = "Mehmet Kaya", Email = "mehmet@test.com", Phone = "05552223344" };
        var employee1 = new Employee { Id = 1, FullName = "Kemal Berber", IsActive = true };
        var employee2 = new Employee { Id = 2, FullName = "Hasan Berber", IsActive = true };
        var service1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 200, IsActive = true };

        context.Users.AddRange(user1, user2);
        context.Employees.AddRange(employee1, employee2);
        context.Services.Add(service1);

        var baseDate = new DateTime(2026, 7, 1, 10, 0, 0, DateTimeKind.Utc);

        // 5 adet randevu ekle
        var appt1 = new Appointment { Id = 1, UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = baseDate.AddDays(1), Status = AppointmentStatus.Confirmed, Notes = "VIP Müşteri" };
        var appt2 = new Appointment { Id = 2, UserId = 1, EmployeeId = 1, ServiceId = 1, StartAt = baseDate.AddDays(2), Status = AppointmentStatus.Completed, Notes = "Standart" };
        var appt3 = new Appointment { Id = 3, UserId = 2, EmployeeId = 1, ServiceId = 1, StartAt = baseDate.AddDays(3), Status = AppointmentStatus.Confirmed, Notes = "İlk Randevu" };
        var appt4 = new Appointment { Id = 4, UserId = 2, EmployeeId = 2, ServiceId = 1, StartAt = baseDate.AddDays(4), Status = AppointmentStatus.Cancelled, Notes = "İptal Notu" };
        var appt5 = new Appointment { Id = 5, UserId = 1, EmployeeId = 2, ServiceId = 1, StartAt = baseDate.AddDays(5), Status = AppointmentStatus.Confirmed, Notes = "Özel İstek" };

        context.Appointments.AddRange(appt1, appt2, appt3, appt4, appt5);
        await context.SaveChangesAsync();

        var repo = new AppointmentRepository(context);

        // Act 1: Yalnızca EmployeeId = 1 ve Status = Confirmed filtrele (appt1 ve appt3 uymalı -> 2 kayıt)
        var (items1, total1) = await repo.GetPagedAsync(
            employeeId: 1, userId: null, status: AppointmentStatus.Confirmed,
            start: null, end: null, search: null, pageNumber: 1, pageSize: 10);

        items1.Should().HaveCount(2);
        total1.Should().Be(2);

        // Act 2: Arama (Search = "Ahmet" -> Sadece User 1'e ait randevular: appt1, appt2, appt5 -> 3 kayıt)
        var (items2, total2) = await repo.GetPagedAsync(
            employeeId: null, userId: null, status: null,
            start: null, end: null, search: "Ahmet", pageNumber: 1, pageSize: 10);

        items2.Should().HaveCount(3);
        total2.Should().Be(3);

        // Act 3: Tarih Aralığı Filtresi (baseDate.AddDays(1) ile baseDate.AddDays(2) arası -> appt1 ve appt2)
        var (items3, total3) = await repo.GetPagedAsync(
            employeeId: null, userId: null, status: null,
            start: baseDate.AddDays(1), end: baseDate.AddDays(2).AddHours(23), search: null, pageNumber: 1, pageSize: 10);

        items3.Should().HaveCount(2);
        total3.Should().Be(2);

        // Act 4: Birleşik Arama + Filtre + Sayfalama
        // (UserId = 1, Search = "VIP", PageNumber = 1, PageSize = 1 -> Toplam 1 kayıt)
        var (items4, total4) = await repo.GetPagedAsync(
            employeeId: null, userId: 1, status: null,
            start: null, end: null, search: "VIP", pageNumber: 1, pageSize: 1);

        items4.Should().HaveCount(1);
        total4.Should().Be(1);
        items4[0].Id.Should().Be(1);

        // Act 5: Sayfalama (PageSize = 2, PageNumber = 1 -> 2 kayıt, toplam 5 kayıt)
        var (items5, total5) = await repo.GetPagedAsync(
            employeeId: null, userId: null, status: null,
            start: null, end: null, search: null, pageNumber: 1, pageSize: 2);

        items5.Should().HaveCount(2);
        total5.Should().Be(5);
    }
}

