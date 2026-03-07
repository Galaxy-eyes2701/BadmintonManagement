using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. THÊM CONTROLLERS
builder.Services.AddControllers();

// 2. CẤU HÌNH SWAGGER (Tích hợp nút nhập Token JWT)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập Token JWT vào đây (VD: Bearer eyJhbGci...)"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// 3. CẤU HÌNH DATABASE (Entity Framework Core)
builder.Services.AddDbContext<BadmintonManagementContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. CẤU HÌNH CORS (Cho phép React/Vue gọi API mà không bị chặn)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Port của Vite và CRA
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Cần thiết nếu dùng Cookie/Token
    });
});

// 5. CẤU HÌNH JWT AUTHENTICATION (Đọc từ appsettings)
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
    });

// ==========================================================
// 6. ĐĂNG KÝ DEPENDENCY INJECTION (DI) CHO TEAM
// ==========================================================

// -> Tầng Repository (Dùng chung)

// builder.Services.AddScoped<IAuthService, AuthService>();
// builder.Services.AddScoped<ICourtService, CourtService>();

builder.Services.AddScoped<IPosService, PosService>();
builder.Services.AddScoped<IVoucherService, VoucherService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();


var app = builder.Build();

// ==========================================================
// 7. CẤU HÌNH PIPELINE (MIDDLEWARE)
// ==========================================================

// Dùng Swagger ở cả môi trường Dev và lúc Deploy để dễ test
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// BẮT BUỘC: Dùng CORS trước khi Auth
app.UseCors("AllowAll");

// BẮT BUỘC: Auth trước khi gọi Controller
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();