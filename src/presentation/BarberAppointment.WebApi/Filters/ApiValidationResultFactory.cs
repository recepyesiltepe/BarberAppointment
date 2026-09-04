using BarberAppointment.Core.Results;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Results;

namespace BarberAppointment.WebApi.Filters;

public class ApiValidationResultFactory : IFluentValidationAutoValidationResultFactory
{
    public Task<IActionResult?> CreateActionResult(
        ActionExecutingContext context,
        ValidationProblemDetails? validationProblemDetails,
        IDictionary<IValidationContext, ValidationResult>? validationResults)
    {
        var errors = new List<string>();

        if (validationResults != null && validationResults.Count > 0)
        {
            foreach (var result in validationResults.Values)
            {
                foreach (var err in result.Errors)
                {
                    errors.Add(string.IsNullOrEmpty(err.PropertyName)
                        ? err.ErrorMessage
                        : $"{err.PropertyName}: {err.ErrorMessage}");
                }
            }
        }
        else if (validationProblemDetails?.Errors != null && validationProblemDetails.Errors.Count > 0)
        {
            foreach (var kvp in validationProblemDetails.Errors)
            {
                foreach (var err in kvp.Value)
                {
                    errors.Add(string.IsNullOrEmpty(kvp.Key) ? err : $"{kvp.Key}: {err}");
                }
            }
        }
        else
        {
            errors.Add("Doğrulama hatası oluştu.");
        }

        var apiResponse = ApiResponse.Fail(errors, StatusCodes.Status400BadRequest);
        apiResponse.Message = "Doğrulama hatası.";

        IActionResult resultAction = new BadRequestObjectResult(apiResponse);
        return Task.FromResult<IActionResult?>(resultAction);
    }
}
