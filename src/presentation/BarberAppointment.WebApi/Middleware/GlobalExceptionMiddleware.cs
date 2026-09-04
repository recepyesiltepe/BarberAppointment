using System.Net;
using System.Text.Json;
using BarberAppointment.Core.Exceptions;
using BarberAppointment.Core.Results;
using FluentValidation;

namespace BarberAppointment.WebApi.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public GlobalExceptionMiddleware(RequestDelegate _next, ILogger<GlobalExceptionMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var response = context.Response;
        response.ContentType = "application/json; charset=utf-8";

        ApiResponse apiResponse;

        switch (exception)
        {
            // FluentValidation ValidationException
            case ValidationException fluentEx:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                var validationErrors = fluentEx.Errors
                    .Select(e => string.IsNullOrEmpty(e.PropertyName)
                        ? e.ErrorMessage
                        : $"{e.PropertyName}: {e.ErrorMessage}")
                    .ToList();
                apiResponse = ApiResponse.Fail(validationErrors, (int)HttpStatusCode.BadRequest);
                apiResponse.Message = "Doğrulama hatası.";
                _logger.LogWarning("Validation failed: {Errors}", string.Join(", ", validationErrors));
                break;

            // Özel AppValidationException
            case AppValidationException appValEx:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                apiResponse = ApiResponse.Fail(appValEx.ValidationErrors.ToList(), (int)HttpStatusCode.BadRequest);
                apiResponse.Message = appValEx.Message;
                _logger.LogWarning("App validation failed: {Message}", appValEx.Message);
                break;

            // 404 Not Found
            case NotFoundException notFoundEx:
                response.StatusCode = (int)HttpStatusCode.NotFound;
                apiResponse = ApiResponse.Fail(notFoundEx.Message, (int)HttpStatusCode.NotFound);
                apiResponse.Message = "Kayıt bulunamadı.";
                _logger.LogWarning("Resource not found: {Message}", notFoundEx.Message);
                break;

            // 409 Conflict
            case ConflictException conflictEx:
                response.StatusCode = (int)HttpStatusCode.Conflict;
                apiResponse = ApiResponse.Fail(conflictEx.Message, (int)HttpStatusCode.Conflict);
                apiResponse.Message = "Kaynak çakışması.";
                _logger.LogWarning("Conflict detected: {Message}", conflictEx.Message);
                break;

            // 400 Diğer İş Kuralı Hataları
            case BusinessException businessEx:
                response.StatusCode = businessEx.StatusCode;
                apiResponse = ApiResponse.Fail(businessEx.Message, businessEx.StatusCode);
                apiResponse.Message = "İş kuralı hatası.";
                _logger.LogWarning("Business rule violation: {Message}", businessEx.Message);
                break;

            // 401 Unauthorized
            case UnauthorizedAccessException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                apiResponse = ApiResponse.Fail("Bu işlem için yetkiniz bulunmamaktadır.", (int)HttpStatusCode.Unauthorized);
                apiResponse.Message = "Yetkisiz erişim.";
                _logger.LogWarning("Unauthorized access attempt");
                break;

            // 500 Beklenmeyen Sistem Hatası
            default:
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                apiResponse = ApiResponse.Fail("Beklenmeyen bir sunucu hatası meydana geldi.", (int)HttpStatusCode.InternalServerError);
                apiResponse.Message = "Sunucu Hatası.";
                _logger.LogError(exception, "Unhandled system exception: {Message}", exception.Message);
                break;
        }

        var json = JsonSerializer.Serialize(apiResponse, JsonOptions);
        await response.WriteAsync(json);
    }
}

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionMiddleware>();
    }
}
