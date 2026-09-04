namespace BarberAppointment.Core.Exceptions;

public class BusinessException : Exception
{
    public int StatusCode { get; }

    public BusinessException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class NotFoundException : BusinessException
{
    public NotFoundException(string message) : base(message, 404) { }
}

public class ConflictException : BusinessException
{
    public ConflictException(string message) : base(message, 409) { }
}

public class AppValidationException : BusinessException
{
    public IReadOnlyList<string> ValidationErrors { get; }

    public AppValidationException(string message) : base(message, 400)
    {
        ValidationErrors = new List<string> { message };
    }

    public AppValidationException(IEnumerable<string> errors) : base("Doğrulama hatası oluştu.", 400)
    {
        ValidationErrors = errors.ToList();
    }
}
