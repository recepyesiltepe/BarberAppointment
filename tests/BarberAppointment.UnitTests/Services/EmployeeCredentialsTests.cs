using BarberAppointment.Core.Enums;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Data.Repositories.Interfaces;
using BarberAppointment.Domain.Entities;
using BarberAppointment.Services.DTOs;
using BarberAppointment.Services.Security;
using FluentAssertions;
using Moq;
using Xunit;
using EmployeeServiceImpl = BarberAppointment.Services.Implementations.EmployeeService;

namespace BarberAppointment.UnitTests.Services;

public class EmployeeCredentialsTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IEmployeeRepository> _employeeRepoMock;
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IServiceRepository> _serviceRepoMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly EmployeeServiceImpl _sut;

    public EmployeeCredentialsTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _employeeRepoMock = new Mock<IEmployeeRepository>();
        _userRepoMock = new Mock<IUserRepository>();
        _serviceRepoMock = new Mock<IServiceRepository>();
        _passwordHasherMock = new Mock<IPasswordHasher>();

        _unitOfWorkMock.Setup(u => u.Employees).Returns(_employeeRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Users).Returns(_userRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Services).Returns(_serviceRepoMock.Object);

        // Varsayılan password hasher mock davranışı
        _passwordHasherMock.Setup(p => p.CreatePasswordHash(
            It.IsAny<string>(),
            out It.Ref<byte[]>.IsAny,
            out It.Ref<byte[]>.IsAny))
            .Callback(new CreatePasswordHashCallback((string pw, out byte[] h, out byte[] s) =>
            {
                h = new byte[] { 1, 2, 3 };
                s = new byte[] { 4, 5, 6 };
            }));

        _sut = new EmployeeServiceImpl(_unitOfWorkMock.Object, _passwordHasherMock.Object);
    }

    private delegate void CreatePasswordHashCallback(string password, out byte[] hash, out byte[] salt);

    [Fact]
    public async Task CreateAsync_WhenEmailAndStrongPasswordProvided_CreatesUserAndEmployeeWithCredentials()
    {
        // Arrange
        var dto = new CreateEmployeeDto
        {
            FullName = "Ahmet Berber",
            Title = "Kıdemli Kuaför",
            Email = "ahmet@example.com",
            Password = "Password123!",
            Phone = "5551112233"
        };

        User? capturedUser = null;
        _userRepoMock.Setup(u => u.GetByEmailAsync("ahmet@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        _userRepoMock.Setup(u => u.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) =>
            {
                u.Id = 42;
                capturedUser = u;
            })
            .Returns(Task.CompletedTask);

        _employeeRepoMock.Setup(e => e.AddAsync(It.IsAny<Employee>(), It.IsAny<CancellationToken>()))
            .Callback<Employee, CancellationToken>((emp, _) =>
            {
                emp.Id = 10;
            })
            .Returns(Task.CompletedTask);

        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Employee
            {
                Id = 10,
                FullName = "Ahmet Berber",
                Title = "Kıdemli Kuaför",
                UserId = 42,
                User = new User { Id = 42, Email = "ahmet@example.com", Phone = "5551112233" }
            });

        // Act
        var result = await _sut.CreateAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result.FullName.Should().Be("Ahmet Berber");
        result.Email.Should().Be("ahmet@example.com");
        result.UserId.Should().Be(42);

        capturedUser.Should().NotBeNull();
        capturedUser!.Email.Should().Be("ahmet@example.com");
        capturedUser.Role.Should().Be(UserRole.Employee);
        capturedUser.IsEmailVerified.Should().BeTrue();
        capturedUser.IsActive.Should().BeTrue();
        capturedUser.PasswordHash.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreateAsync_WhenEmailAlreadyExists_ThrowsConflictException()
    {
        // Arrange
        var dto = new CreateEmployeeDto
        {
            FullName = "Mehmet Usta",
            Email = "existing@example.com",
            Password = "Password123!"
        };

        _userRepoMock.Setup(u => u.GetByEmailAsync("existing@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 99, Email = "existing@example.com" });

        // Act
        Func<Task> act = () => _sut.CreateAsync(dto);

        // Assert
        await act.Should().ThrowAsync<ConflictException>()
            .WithMessage("*zaten kayıtlı bir kullanıcı bulunmaktadır*");
    }

    [Fact]
    public async Task UpdateAsync_WhenEmailAndPasswordProvided_UpdatesUserCredentials()
    {
        // Arrange
        var existingUser = new User
        {
            Id = 5,
            Email = "old@example.com",
            FullName = "Eski İsim",
            PasswordHash = new byte[] { 9, 9, 9 },
            PasswordSalt = new byte[] { 8, 8, 8 }
        };

        var existingEmp = new Employee
        {
            Id = 3,
            FullName = "Eski İsim",
            UserId = 5
        };

        _employeeRepoMock.Setup(e => e.GetByIdAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingEmp);
        _userRepoMock.Setup(u => u.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);
        _userRepoMock.Setup(u => u.GetByEmailAsync("new@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Employee
            {
                Id = 3,
                FullName = "Yeni İsim",
                UserId = 5,
                User = existingUser
            });

        var updateDto = new UpdateEmployeeDto
        {
            FullName = "Yeni İsim",
            Email = "new@example.com",
            Password = "NewSecurePassword123!",
            IsActive = true
        };

        // Act
        var result = await _sut.UpdateAsync(3, updateDto);

        // Assert
        result.FullName.Should().Be("Yeni İsim");
        existingUser.Email.Should().Be("new@example.com");
        existingUser.PasswordHash.Should().Equal(new byte[] { 1, 2, 3 });
        _userRepoMock.Verify(u => u.Update(existingUser), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenPasswordIsEmpty_KeepsExistingPassword()
    {
        // Arrange
        var originalHash = new byte[] { 99, 99 };
        var existingUser = new User
        {
            Id = 7,
            Email = "staff@example.com",
            FullName = "Personel",
            PasswordHash = originalHash
        };

        var existingEmp = new Employee
        {
            Id = 4,
            FullName = "Personel",
            UserId = 7
        };

        _employeeRepoMock.Setup(e => e.GetByIdAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingEmp);
        _userRepoMock.Setup(u => u.GetByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        _employeeRepoMock.Setup(e => e.GetByIdWithServicesAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Employee
            {
                Id = 4,
                FullName = "Güncel Personel",
                UserId = 7,
                User = existingUser
            });

        var updateDto = new UpdateEmployeeDto
        {
            FullName = "Güncel Personel",
            Email = "staff@example.com",
            Password = "", // Boş şifre
            IsActive = true
        };

        // Act
        await _sut.UpdateAsync(4, updateDto);

        // Assert
        existingUser.PasswordHash.Should().Equal(originalHash);
        _passwordHasherMock.Verify(p => p.CreatePasswordHash(
            It.IsAny<string>(),
            out It.Ref<byte[]>.IsAny,
            out It.Ref<byte[]>.IsAny), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_SoftDeletesEmployeeAndDeactivatesLinkedUser()
    {
        // Arrange
        var linkedUser = new User { Id = 8, IsActive = true };
        var employee = new Employee { Id = 12, UserId = 8, IsActive = true };

        _employeeRepoMock.Setup(e => e.GetByIdAsync(12, It.IsAny<CancellationToken>()))
            .ReturnsAsync(employee);
        _userRepoMock.Setup(u => u.GetByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(linkedUser);

        // Act
        await _sut.DeleteAsync(12);

        // Assert
        employee.IsActive.Should().BeFalse();
        linkedUser.IsActive.Should().BeFalse();
        _employeeRepoMock.Verify(e => e.Update(employee), Times.Once);
        _userRepoMock.Verify(u => u.Update(linkedUser), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
