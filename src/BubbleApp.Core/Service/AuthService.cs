using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Auth;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BubbleApp.Core.Service
{
    public class AuthService : IAuthService
    {
        private readonly IAdminRepository _admins;
        private readonly IConfiguration _cfg;

        public AuthService(IAdminRepository admins, IConfiguration cfg)
        {
            _admins = admins;
            _cfg = cfg;
        }

        public async Task<AuthResponse> RegisterAsync(AdminRegisterRequest req, CancellationToken ct = default)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var existing = await _admins.GetByEmailAsync(email, ct);
            if (existing != null) throw new InvalidOperationException("Email already exists.");

            var admin = new Admin
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                CreatedAt = DateTime.UtcNow
            };

            await _admins.CreateAsync(admin, ct);

            var token = CreateJwt(admin);
            return new AuthResponse(token, admin.Email);
        }

        public async Task<AuthResponse> LoginAsync(AdminLoginRequest req, CancellationToken ct = default)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var admin = await _admins.GetByEmailAsync(email, ct);
            if (admin is null || !BCrypt.Net.BCrypt.Verify(req.Password, admin.PasswordHash))
                throw new UnauthorizedAccessException("Invalid credentials.");

            var token = CreateJwt(admin);
            return new AuthResponse(token, admin.Email);
        }

        private string CreateJwt(Admin admin)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // NameIdentifier claim helps reading adminId easily from API
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, admin.Id),
                new Claim(JwtRegisteredClaimNames.Sub, admin.Id),
                new Claim(JwtRegisteredClaimNames.Email, admin.Email),
                new Claim("role", "admin")
            };

            var token = new JwtSecurityToken(
                issuer: _cfg["Jwt:Issuer"],
                audience: _cfg["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8), 
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}