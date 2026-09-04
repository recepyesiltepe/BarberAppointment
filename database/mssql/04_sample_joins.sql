SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

PRINT N'--- INNER JOIN: randevu + müşteri + usta + hizmet ---';

SELECT
    a.Id AS AppointmentId,
    u.FullName AS Customer,
    e.FullName AS Employee,
    s.Name AS ServiceName,
    s.DurationMinutes,
    a.StartAt,
    a.EndAt,
    a.Status
FROM dbo.Appointments AS a
INNER JOIN dbo.Users AS u ON u.Id = a.UserId
INNER JOIN dbo.Employees AS e ON e.Id = a.EmployeeId
INNER JOIN dbo.Services AS s ON s.Id = a.ServiceId;
GO

PRINT N'--- LEFT JOIN: tüm ustalar ve verdikleri hizmetler (hizmeti olmayan da gelir) ---';

SELECT
    e.FullName AS Employee,
    s.Name AS ServiceName
FROM dbo.Employees AS e
LEFT JOIN dbo.EmployeeServices AS es ON es.EmployeeId = e.Id
LEFT JOIN dbo.Services AS s ON s.Id = es.ServiceId
ORDER BY e.FullName, s.Name;
GO

PRINT N'--- JOIN: belirli hizmeti verebilen aktif personel ---';

SELECT
    e.Id,
    e.FullName,
    e.Title
FROM dbo.Employees AS e
INNER JOIN dbo.EmployeeServices AS es ON es.EmployeeId = e.Id
INNER JOIN dbo.Services AS s ON s.Id = es.ServiceId
WHERE s.Id = 1
  AND e.IsActive = 1
  AND s.IsActive = 1;
GO
