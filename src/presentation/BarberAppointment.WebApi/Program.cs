using BarberAppointment.Core.Results;
using BarberAppointment.Data.Extensions;
using BarberAppointment.Services.Extensions;
using BarberAppointment.WebApi.Data;
using BarberAppointment.WebApi.Filters;
using BarberAppointment.WebApi.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;
using System.Reflection;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. CORS Yapılandırması (Web ve Mobil İstemciler İçin)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 2. Controller ve FluentValidation AutoValidation Yapılandırması
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation(configuration =>
{
    configuration.OverrideDefaultResultFactoryWith<ApiValidationResultFactory>();
});

// Model validation hatalarını standart ApiResponse formatına dönüştür
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(kvp => kvp.Value!.Errors.Select(err =>
                string.IsNullOrEmpty(kvp.Key) ? err.ErrorMessage : $"{kvp.Key}: {err.ErrorMessage}"))
            .ToList();

        var response = ApiResponse.Fail(errors, StatusCodes.Status400BadRequest);
        response.Message = "Doğrulama hatası.";

        return new BadRequestObjectResult(response);
    };
});

// 3. Data & Repository Katmanı Kaydı
builder.Services.AddDataServices(builder.Configuration);

// 4. Business Logic, Security, Policies, Email (SMTP) & FluentValidation Katmanı Kaydı
builder.Services.AddBusinessServices(builder.Configuration);

// 5. JWT Authentication & Authorization
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? "BarberAppointment_Super_Secret_Key_For_JWT_Authentication_2026_Secure_Must_Be_Long_Enough!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BarberAppointment";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BarberAppointmentClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 6. Swagger / OpenAPI Yapılandırması (JWT Destekli)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BarberAppointment API",
        Version = "v1",
        Description = "Kuaför Randevu Yönetim Sistemi REST API — Web ve Mobile İstemcileri İçin Hazır Backend",
        Contact = new OpenApiContact
        {
            Name = "BarberAppointment Dev Team",
            Email = "dev@barberappointment.com"
        }
    });

    // XML comment dosyasını dahil et
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        options.IncludeXmlComments(xmlPath);

    // Swagger UI JWT Bearer Güvenlik Tanımı
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Access Token giriniz. Örnek: Bearer {token}"
    };

    options.AddSecurityDefinition("Bearer", scheme);

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});

var app = builder.Build();

// 6.5. Otomatik Veritabanı ve Demo Hesaplar Başlangıç Seed İşlemi
await DbInitializer.SeedAsync(app.Services);

// 7. Global Exception Handling Middleware (En başta olmalıdır!)
app.UseGlobalExceptionHandler();

// 8. CORS Middleware
app.UseCors("AllowAll");

// 9. HTTP Pipeline Yapılandırması
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "BarberAppointment API v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "BarberAppointment API - Swagger UI";
        c.DefaultModelsExpandDepth(2);
        c.DefaultModelExpandDepth(2);
        c.DisplayRequestDuration();
    });

    app.MapOpenApi();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
