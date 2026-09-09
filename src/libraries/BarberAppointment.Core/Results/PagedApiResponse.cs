namespace BarberAppointment.Core.Results;

public class PagedApiResponse<T> : ApiResponse<IReadOnlyList<T>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public int TotalCount { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public static PagedApiResponse<T> Ok(
        IReadOnlyList<T> items,
        int totalCount,
        int pageNumber,
        int pageSize,
        string? message = null,
        int statusCode = 200)
    {
        return new PagedApiResponse<T>
        {
            Success = true,
            StatusCode = statusCode,
            Data = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            Message = message,
            Timestamp = DateTime.UtcNow
        };
    }

    public static PagedApiResponse<T> Ok(PagedResult<T> pagedResult, string? message = null, int statusCode = 200)
    {
        return Ok(pagedResult.Items, pagedResult.TotalCount, pagedResult.PageNumber, pagedResult.PageSize, message, statusCode);
    }
}

