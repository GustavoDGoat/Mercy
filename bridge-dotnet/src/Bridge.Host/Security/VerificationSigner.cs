using System.Security.Cryptography;
using System.Text;

namespace Bridge.Host.Security;

public static class VerificationSigner
{
    public static string Sign(string userId, DateTime timestamp, bool match)
    {
        var secret = GetSecret();
        var payload = $"{userId}|{timestamp:O}|{(match ? "match" : "no_match")}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(hash);
    }

    public static bool Validate(string userId, DateTime timestamp, bool expectedMatch, string token)
    {
        var expectedToken = Sign(userId, timestamp, expectedMatch);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedToken),
            Encoding.UTF8.GetBytes(token));
    }

    private static string GetSecret()
    {
        var envSecret = Environment.GetEnvironmentVariable("VERIFICATION_SECRET");
        if (!string.IsNullOrWhiteSpace(envSecret))
            return envSecret;

        var configPath = Path.Combine(AppContext.BaseDirectory, "bridge-secret.txt");
        if (File.Exists(configPath))
            return File.ReadAllText(configPath).Trim();

        throw new InvalidOperationException(
            "VERIFICATION_SECRET not configured. Set the environment variable " +
            "or create bridge-secret.txt in the bridge directory.");
    }
}
