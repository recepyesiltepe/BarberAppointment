namespace BarberAppointment.Core.Results;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public int StatusCode { get; set; } = 200;
    public string? Message { get; set; }
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public static ApiResponse<T> Ok(T data, string? message = null, int statusCode = 200) =>
        new()
        {
            Success = true,
            StatusCode = statusCode,
            Data = data,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

    public static ApiResponse<T> Fail(string error, int statusCode = 400) =>
        new()
        {
            Success = false,
            StatusCode = statusCode,
            Errors = new List<string> { error },
            Timestamp = DateTime.UtcNow
        };

    public static ApiResponse<T> Fail(List<string> errors, int statusCode = 400) =>
        new()
        {
            Success = false,
            StatusCode = statusCode,
            Errors = errors,
            Timestamp = DateTime.UtcNow
        };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string? message = null, int statusCode = 200) =>
        new()
        {
            Success = true,
            StatusCode = statusCode,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

    public static new ApiResponse Fail(string error, int statusCode = 400) =>
        new()
        {
            Success = false,
            StatusCode = statusCode,
            Errors = new List<string> { error },
            Timestamp = DateTime.UtcNow
        };

    public static new ApiResponse Fail(List<string> errors, int statusCode = 400) =>
        new()
        {
            Success = false,
            StatusCode = statusCode,
            Errors = errors,
            Timestamp = DateTime.UtcNow
        };
}
