SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

DELETE FROM dbo.Appointments;
DELETE FROM dbo.EmployeeServices;
DELETE FROM dbo.Employees;
DELETE FROM dbo.Services;
DELETE FROM dbo.Users;
GO

SET IDENTITY_INSERT dbo.Users ON;
INSERT INTO dbo.Users (Id, FullName, Email, Phone, Role, IsActive)
VALUES
    (1, N'Ayşe Demir', N'ayse@example.com', N'5551112233', 1, 1),
    (2, N'Yönetici Kaya', N'admin@example.com', N'5550000000', 2, 1),
    (3, N'Ali Usta', N'ali@example.com', N'5552223344', 3, 1),
    (4, N'Burak Yılmaz', N'burak@example.com', N'5553334455', 1, 1),
    (5, N'Sistem Yöneticisi', N'superadmin@example.com', N'5550000000', 2, 1);
SET IDENTITY_INSERT dbo.Users OFF;
GO

SET IDENTITY_INSERT dbo.Employees ON;
INSERT INTO dbo.Employees (Id, UserId, FullName, Title, IsActive)
VALUES
    (1, 3, N'Ali Usta', N'Berber', 1),
    (2, NULL, N'Mehmet Usta', N'Saç tasarım', 1);
SET IDENTITY_INSERT dbo.Employees OFF;
GO

SET IDENTITY_INSERT dbo.Services ON;
INSERT INTO dbo.Services (Id, Name, DurationMinutes, Price, IsActive)
VALUES
    (1, N'Saç kesimi', 30, 250.00, 1),
    (2, N'Sakal tıraşı', 20, 150.00, 1),
    (3, N'Saç + sakal', 45, 350.00, 1);
SET IDENTITY_INSERT dbo.Services OFF;
GO

INSERT INTO dbo.EmployeeServices (EmployeeId, ServiceId)
VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 1), (2, 3);
GO

SET IDENTITY_INSERT dbo.Appointments ON;
INSERT INTO dbo.Appointments (Id, UserId, EmployeeId, ServiceId, StartAt, EndAt, Status, Notes)
VALUES
    (
        1, 1, 1, 1,
        DATETIME2FROMPARTS(2026, 8, 26, 11, 0, 0, 0, 0),
        DATETIME2FROMPARTS(2026, 8, 26, 11, 30, 0, 0, 0),
        2,
        N'İlk ziyaret'
    );
SET IDENTITY_INSERT dbo.Appointments OFF;
GO
