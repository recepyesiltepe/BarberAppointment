using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Implementations;
using FluentAssertions;
using Moq;
using Xunit;

namespace BarberAppointment.UnitTests.Services;

public class CompositeServiceTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly ServiceManagementService _serviceManagementService;

    public CompositeServiceTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _serviceRepoMock = new Mock<IServiceRepository>();

        _unitOfWorkMock.Setup(u => u.Services).Returns(_serviceRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        _serviceManagementService = new ServiceManagementService(_unitOfWorkMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WhenCompositeWithValidSubServices_AutoCalculatesDurationAndPrice()
    {
        // Arrange
        var sub1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 200, IsActive = true, IsComposite = false };
        var sub2 = new Service { Id = 2, Name = "Sakal Tıraşı", DurationMinutes = 20, Price = 100, IsActive = true, IsComposite = false };

        _serviceRepoMock
            .Setup(r => r.GetByIdsAsync(It.Is<IEnumerable<int>>(ids => ids.Contains(1) && ids.Contains(2)), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { sub1, sub2 });

        Service? capturedService = null;
        _serviceRepoMock
            .Setup(r => r.AddAsync(It.IsAny<Service>(), It.IsAny<CancellationToken>()))
            .Callback<Service, CancellationToken>((s, _) =>
            {
                s.Id = 10;
                capturedService = s;
            })
            .Returns(Task.CompletedTask);

        _serviceRepoMock
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => capturedService);

        var dto = new CreateServiceDto
        {
            Name = "Saç & Sakal Kombini",
            IsComposite = true,
            SubServiceIds = new List<int> { 1, 2 },
            DurationMinutes = 0, // Otomatik hesaplanmalı
            Price = 0            // Otomatik hesaplanmalı
        };

        // Act
        var result = await _serviceManagementService.CreateAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result.IsComposite.Should().BeTrue();
        result.DurationMinutes.Should().Be(50); // 30 + 20
        result.Price.Should().Be(300);          // 200 + 100
        capturedService.Should().NotBeNull();
        capturedService!.SubServiceItems.Should().HaveCount(2);
    }

    [Fact]
    public async Task CreateAsync_WhenCompositeWithCustomPrice_AllowsDiscountedPackagePrice()
    {
        // Arrange
        var sub1 = new Service { Id = 1, Name = "Saç Kesimi", DurationMinutes = 30, Price = 250, IsActive = true, IsComposite = false };
        var sub2 = new Service { Id = 2, Name = "Sakal Tıraşı", DurationMinutes = 20, Price = 150, IsActive = true, IsComposite = false };

        _serviceRepoMock
            .Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { sub1, sub2 });

        Service? capturedService = null;
        _serviceRepoMock
            .Setup(r => r.AddAsync(It.IsAny<Service>(), It.IsAny<CancellationToken>()))
            .Callback<Service, CancellationToken>((s, _) =>
            {
                s.Id = 11;
                capturedService = s;
            })
            .Returns(Task.CompletedTask);

        _serviceRepoMock
            .Setup(r => r.GetByIdAsync(11, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => capturedService);

        var dto = new CreateServiceDto
        {
            Name = "Avantajlı Bakım Paketi",
            IsComposite = true,
            SubServiceIds = new List<int> { 1, 2 },
            DurationMinutes = 45, // Özel süre
            Price = 320           // İndirimli paket fiyatı (250 + 150 = 400 yerine 320)
        };

        // Act
        var result = await _serviceManagementService.CreateAsync(dto);

        // Assert
        result.Price.Should().Be(320);
        result.DurationMinutes.Should().Be(45);
    }

    [Fact]
    public async Task CreateAsync_WhenCompositeHasLessThanTwoSubServices_ThrowsBusinessException()
    {
        // Arrange
        var dto = new CreateServiceDto
        {
            Name = "Yetersiz Paket",
            IsComposite = true,
            SubServiceIds = new List<int> { 1 },
            DurationMinutes = 30,
            Price = 100
        };

        // Act & Assert
        var act = () => _serviceManagementService.CreateAsync(dto);
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*en az 2 farklı alt hizmet seçilmelidir*");
    }

    [Fact]
    public async Task CreateAsync_WhenSubServiceIsAlreadyComposite_ThrowsBusinessException()
    {
        // Arrange
        var sub1 = new Service { Id = 1, Name = "Standart Hizmet", DurationMinutes = 30, Price = 100, IsComposite = false };
        var sub2 = new Service { Id = 2, Name = "Zaten Paket Hizmet", DurationMinutes = 40, Price = 150, IsComposite = true };

        _serviceRepoMock
            .Setup(r => r.GetByIdsAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Service> { sub1, sub2 });

        var dto = new CreateServiceDto
        {
            Name = "İç İçe Paket",
            IsComposite = true,
            SubServiceIds = new List<int> { 1, 2 },
            DurationMinutes = 70,
            Price = 250
        };

        // Act & Assert
        var act = () => _serviceManagementService.CreateAsync(dto);
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*başka bir kompozit hizmeti alt hizmet olarak içeremez*");
    }

    [Fact]
    public async Task UpdateAsync_WhenCompositeIncludesSelf_ThrowsBusinessException()
    {
        // Arrange
        var existing = new Service { Id = 5, Name = "Paket A", DurationMinutes = 50, Price = 200, IsComposite = true };
        _serviceRepoMock.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var dto = new UpdateServiceDto
        {
            Name = "Paket A",
            IsComposite = true,
            SubServiceIds = new List<int> { 1, 5 }, // Kendisini içeriyor
            DurationMinutes = 50,
            Price = 200
        };

        // Act & Assert
        var act = () => _serviceManagementService.UpdateAsync(5, dto);
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*kendisini alt hizmet olarak içeremez*");
    }

    [Fact]
    public async Task DeleteAsync_WhenServiceIsPartOfActiveComposite_ThrowsBusinessException()
    {
        // Arrange
        var service = new Service { Id = 3, Name = "Sakal Tıraşı", IsActive = true };
        _serviceRepoMock.Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(service);
        _serviceRepoMock.Setup(r => r.IsPartOfCompositeServiceAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act & Assert
        var act = () => _serviceManagementService.DeleteAsync(3);
        await act.Should().ThrowAsync<BusinessException>()
            .WithMessage("*aktif bir paket (kompozit) hizmetin içeriğinde yer aldığı için silinemez*");
    }
}

