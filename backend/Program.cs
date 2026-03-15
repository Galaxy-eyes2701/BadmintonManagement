using backend.Interface.Repository;
using backend.Interface.Service;
using backend.Models;
using backend.Repository;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ======================
// Controllers & JSON Options
// ======================
builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Cắt đứt vòng lặp vô tận khi Entity Framework móc nối các bảng
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddScoped<EmailService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập Token JWT vào đây (VD: Bearer eyJhbGci...)"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// ======================
// Database Context
// ======================
builder.Services.AddDbContext<BadmintonManagementContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ======================
// CORS (React)
// ======================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ======================
// JWT Authentication
// ======================
var jwtKey = builder.Configuration["Jwt:Key"] ?? "THIS_IS_SUPER_SECRET_KEY_FOR_BADMINTON_MANAGEMENT_123456";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BadmintonAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BadmintonClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    
    // THÊM ĐOẠN NÀY ĐỂ XEM LỖI THẬT
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine("JWT FAILED: " + context.Exception.GetType().Name + " - " + context.Exception.Message);
            return Task.CompletedTask;
        }
    };
});

Console.WriteLine("JWT KEY BEING USED: " + jwtKey);
Console.WriteLine("JWT KEY LENGTH: " + jwtKey.Length);
// ======================
// Authorization Policies (Từ nhánh main)
// ======================
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.Requirements.Add(new RoleRequirement("Admin")));

    options.AddPolicy("StaffOnly", policy =>
        policy.Requirements.Add(new RoleRequirement("Staff")));

    options.AddPolicy("CustomerOnly", policy =>
        policy.Requirements.Add(new RoleRequirement("Customer")));

    options.AddPolicy("AdminOrStaff", policy =>
        policy.Requirements.Add(new RoleRequirement("Admin", "Staff")));
});

// ======================
// Custom Services (Dependency Injection)
// ======================
// 1. DI từ nhánh main
builder.Services.AddScoped<IAuthorizationHandler, RoleAuthorizationHandler>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IJwtService, JwtService>();

// 2. DI
builder.Services.AddScoped<IPosService, PosService>();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IBranchRepository, BranchRepository>();
builder.Services.AddScoped<ICourtTypeRepository, CourtTypeRepository>();
builder.Services.AddScoped<ICourtRepository, CourtRepository>();
builder.Services.AddScoped<IAdminUserRepository, AdminUserRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IPriceConfigRepository, PriceConfigRepository>();
builder.Services.AddScoped<ITimeSlotRepository, TimeSlotRepository>();
builder.Services.AddScoped<IAdminVoucherRepository, AdminVoucherRepository>();
builder.Services.AddScoped<IAdminRevenueRepository, AdminRevenueRepository>();
builder.Services.AddScoped<IAdminRevenueService, AdminRevenueService>();
builder.Services.AddScoped<IAdminBookingRepository, AdminBookingRepository>();
builder.Services.AddScoped<IAdminBookingService, AdminBookingService>();


var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

//  app.UseHttpsRedirection();

// Sử dụng policy AllowAll theo nhánh của bạn
app.UseCors("AllowAll");
app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();