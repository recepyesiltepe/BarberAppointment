SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Appointments', N'U') IS NOT NULL DROP TABLE dbo.Appointments;
IF OBJECT_ID(N'dbo.EmployeeServices', N'U') IS NOT NULL DROP TABLE dbo.EmployeeServices;
IF OBJECT_ID(N'dbo.Employees', N'U') IS NOT NULL DROP TABLE dbo.Employees;
IF OBJECT_ID(N'dbo.Services', N'U') IS NOT NULL DROP TABLE dbo.Services;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
GO

CREATE TABLE dbo.Users
(
    Id           INT IDENTITY(1, 1) NOT NULL,
    FullName     NVARCHAR(100)      NOT NULL,
    Email        NVARCHAR(256)      NOT NULL,
    Phone        NVARCHAR(20)       NULL,
    PasswordHash VARBINARY(64)      NOT NULL CONSTRAINT DF_Users_PasswordHash DEFAULT (0x00),
    PasswordSalt VARBINARY(128)     NOT NULL CONSTRAINT DF_Users_PasswordSalt DEFAULT (0x00),
    Role         TINYINT            NOT NULL,
    IsActive     BIT                NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt    DATETIME2(0)       NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN (1, 2, 3)),
    CONSTRAINT CK_Users_FullName CHECK (LEN(LTRIM(RTRIM(FullName))) > 0)
);
GO

CREATE TABLE dbo.Employees
(
    Id          INT IDENTITY(1, 1) NOT NULL,
    UserId      INT                NULL,
    FullName    NVARCHAR(100)      NOT NULL,
    Title       NVARCHAR(100)      NULL,
    IsActive    BIT                NOT NULL CONSTRAINT DF_Employees_IsActive DEFAULT (1),
    CreatedAt   DATETIME2(0)       NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Employees PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Employees_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_Employees_FullName CHECK (LEN(LTRIM(RTRIM(FullName))) > 0)
);
GO

CREATE UNIQUE NONCLUSTERED INDEX UQ_Employees_UserId
    ON dbo.Employees (UserId)
    WHERE UserId IS NOT NULL;
GO

CREATE TABLE dbo.Services
(
    Id               INT IDENTITY(1, 1) NOT NULL,
    Name             NVARCHAR(100)      NOT NULL,
    DurationMinutes  INT                NOT NULL,
    Price            DECIMAL(10, 2)     NOT NULL,
    IsActive         BIT                NOT NULL CONSTRAINT DF_Services_IsActive DEFAULT (1),
    CreatedAt        DATETIME2(0)       NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Services PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT CK_Services_Duration CHECK (DurationMinutes > 0),
    CONSTRAINT CK_Services_Price CHECK (Price >= 0),
    CONSTRAINT CK_Services_Name CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
);
GO

CREATE TABLE dbo.EmployeeServices
(
    EmployeeId INT NOT NULL,
    ServiceId  INT NOT NULL,
    CONSTRAINT PK_EmployeeServices PRIMARY KEY CLUSTERED (EmployeeId, ServiceId),
    CONSTRAINT FK_EmployeeServices_Employees FOREIGN KEY (EmployeeId) REFERENCES dbo.Employees (Id),
    CONSTRAINT FK_EmployeeServices_Services FOREIGN KEY (ServiceId) REFERENCES dbo.Services (Id)
);
GO

CREATE TABLE dbo.Appointments
(
    Id          INT IDENTITY(1, 1) NOT NULL,
    UserId      INT                NOT NULL,
    EmployeeId  INT                NOT NULL,
    ServiceId   INT                NOT NULL,
    StartAt     DATETIME2(0)       NOT NULL,
    EndAt       DATETIME2(0)       NOT NULL,
    Status      TINYINT            NOT NULL,
    Notes       NVARCHAR(500)      NULL,
    IsActive    BIT                NOT NULL CONSTRAINT DF_Appointments_IsActive DEFAULT (1),
    CreatedAt   DATETIME2(0)       NOT NULL CONSTRAINT DF_Appointments_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Appointments PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Appointments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_Appointments_Employees FOREIGN KEY (EmployeeId) REFERENCES dbo.Employees (Id),
    CONSTRAINT FK_Appointments_Services FOREIGN KEY (ServiceId) REFERENCES dbo.Services (Id),
    CONSTRAINT CK_Appointments_Range CHECK (EndAt > StartAt),
    CONSTRAINT CK_Appointments_Status CHECK (Status IN (1, 2, 3, 4))
);
GO

CREATE NONCLUSTERED INDEX IX_Appointments_Employee_Start
    ON dbo.Appointments (EmployeeId, StartAt)
    INCLUDE (EndAt, Status, ServiceId, UserId);

CREATE NONCLUSTERED INDEX IX_Appointments_User_Start
    ON dbo.Appointments (UserId, StartAt)
    INCLUDE (Status, EmployeeId);

CREATE NONCLUSTERED INDEX IX_EmployeeServices_ServiceId
    ON dbo.EmployeeServices (ServiceId);
GO
