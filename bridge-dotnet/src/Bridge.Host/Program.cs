using System.Text.Json;
using System.Text.Json.Serialization;
using Bridge.Host.Logging;
using Bridge.Host.Models;
using Bridge.Host.Scanners;
using Bridge.Host.Security;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors();

var logConfig = app.Configuration.GetSection("Logging");
var logFilePath = logConfig.GetValue<string>("LogFilePath") ?? "logs/bridge.log";
var logToConsole = logConfig.GetValue<bool>("LogToConsole");
var logToFile = logConfig.GetValue<bool>("LogToFile");
BridgeLogger.Initialize(logFilePath, logToConsole, logToFile);

BridgeLogger.Info("bridge_starting", $"Mode: initializing");

IScannerService scanner;
try
{
    scanner = ScannerFactory.Create();
    var status = scanner.GetStatus();
    BridgeLogger.Info("scanner_initialized",
        $"Mode: {status.Mode}, Connected: {status.Connected}, Device: {status.Device.Name}");
}
catch (Exception ex)
{
    BridgeLogger.Error("scanner_init_failed", ex);
    scanner = new MockScannerService();
    BridgeLogger.Warn("scanner_fallback", "Falling back to MockScannerService");
}

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) }
};

app.MapGet("/status", () =>
{
    try
    {
        var s = scanner.GetStatus();
        return Results.Json(s, jsonOptions, statusCode: 200);
    }
    catch (Exception ex)
    {
        BridgeLogger.Error("status_failed", ex);
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.MapPost("/enroll", async (CancellationToken ct) =>
{
    try
    {
        BridgeLogger.Info("enroll_started");
        var result = await scanner.EnrollAsync(ct);
        BridgeLogger.Info("enroll_complete",
            $"Platform: {result.Platform}, Quality: {result.QualityScore}, Captures: {result.CaptureCount}");
        return Results.Json(result, jsonOptions, statusCode: 200);
    }
    catch (OperationCanceledException)
    {
        BridgeLogger.Info("enroll_cancelled");
        return Results.Json(new { error = "Enrollment cancelled by user." }, statusCode: 499);
    }
    catch (InvalidOperationException ex)
    {
        BridgeLogger.Warn("enroll_busy", ex.Message);
        return Results.Json(new { error = ex.Message }, statusCode: 409);
    }
    catch (Exception ex)
    {
        BridgeLogger.Error("enroll_failed", ex);
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.MapPost("/verify", async (VerifyRequest req, CancellationToken ct) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(req.Template))
            return Results.Json(new { error = "Missing 'template' field." }, statusCode: 400);

        BridgeLogger.Info("verify_started", $"Platform: {req.Platform}");
        var result = await scanner.VerifyAsync(req.Template, req.Platform, ct);

        if (result.Match)
        {
            var userId = ExtractUserIdFromTemplate(req.Template);
            var timestamp = DateTime.UtcNow;
            var token = VerificationSigner.Sign(userId, timestamp, true);
            BridgeLogger.Info("verify_match", $"UserId: {userId}");

            return Results.Json(new
            {
                match = true,
                score = result.Score,
                latency_ms = result.LatencyMs,
                quality = result.Quality,
                verification_token = token,
                user_id = userId,
                timestamp
            }, jsonOptions, statusCode: 200);
        }
        else
        {
            BridgeLogger.Info("verify_no_match", result.Error ?? "No match");
            return Results.Json(new
            {
                match = false,
                score = result.Score,
                latency_ms = result.LatencyMs,
                quality = result.Quality,
                error = result.Error
            }, jsonOptions, statusCode: 200);
        }
    }
    catch (OperationCanceledException)
    {
        BridgeLogger.Info("verify_cancelled");
        return Results.Json(new { error = "Verification cancelled by user." }, statusCode: 499);
    }
    catch (InvalidOperationException ex)
    {
        BridgeLogger.Warn("verify_busy", ex.Message);
        return Results.Json(new { error = ex.Message }, statusCode: 409);
    }
    catch (Exception ex)
    {
        BridgeLogger.Error("verify_failed", ex);
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.MapPost("/cancel", () =>
{
    scanner.Cancel();
    BridgeLogger.Info("scan_cancelled");
    return Results.Json(new { status = "cancelled" }, statusCode: 200);
});

app.MapPost("/restart", () =>
{
    scanner.Restart();
    BridgeLogger.Info("scanner_restarted");
    var s = scanner.GetStatus();
    return Results.Json(new { status = "restarted", mode = s.Mode, connected = s.Connected }, jsonOptions, statusCode: 200);
});

app.MapGet("/health", () =>
{
    try
    {
        var health = scanner.GetHealth();
        return Results.Json(health, jsonOptions, statusCode: 200);
    }
    catch (Exception ex)
    {
        BridgeLogger.Error("health_check_failed", ex);
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.MapGet("/diagnostic", () =>
{
    var checks = new List<DiagnosticCheck>();

    try
    {
        var mode = scanner is MockScannerService ? "mock" : "real";
        checks.Add(new DiagnosticCheck { Name = "Scanner Service", Passed = true, Detail = $"Mode: {mode}" });
    }
    catch (Exception ex)
    {
        checks.Add(new DiagnosticCheck { Name = "Scanner Service", Passed = false, Detail = ex.Message });
    }

    try
    {
        var sdkAvail = SystemChecks.IsDpSdkInstalled();
        checks.Add(new DiagnosticCheck
        {
            Name = "DP SDK",
            Passed = sdkAvail,
            Detail = sdkAvail ? "SDK detected" : "SDK not installed — running in mock mode"
        });
    }
    catch (Exception ex)
    {
        checks.Add(new DiagnosticCheck { Name = "DP SDK", Passed = false, Detail = ex.Message });
    }

    try
    {
        var secretOk = SystemChecks.IsSecretConfigured();
        checks.Add(new DiagnosticCheck
        {
            Name = "Crypto",
            Passed = secretOk,
            Detail = secretOk ? "VERIFICATION_SECRET configured" : "VERIFICATION_SECRET not set — tokens will fail"
        });
    }
    catch (Exception ex)
    {
        checks.Add(new DiagnosticCheck { Name = "Crypto", Passed = false, Detail = ex.Message });
    }

    try
    {
        var status = scanner.GetStatus();
        checks.Add(new DiagnosticCheck
        {
            Name = "USB Scanner",
            Passed = status.Connected,
            Detail = status.Connected ? status.Device.Name : "No scanner detected"
        });
    }
    catch (Exception ex)
    {
        checks.Add(new DiagnosticCheck { Name = "USB Scanner", Passed = false, Detail = ex.Message });
    }

    var report = new DiagnosticReport
    {
        Timestamp = DateTime.UtcNow,
        Mode = scanner is MockScannerService ? "mock" : "real",
        Checks = checks,
        AllPassed = checks.TrueForAll(c => c.Passed)
    };

    return Results.Json(report, jsonOptions, statusCode: 200);
});

static string ExtractUserIdFromTemplate(string templateBase64)
{
    if (templateBase64.StartsWith("MOCK:v2:"))
    {
        try
        {
            var raw = Convert.FromBase64String(templateBase64["MOCK:v2:".Length..]);
            var payload = System.Text.Encoding.UTF8.GetString(raw);
            return payload.Split('|')[0];
        }
        catch
        {
            return "unknown";
        }
    }

    using var sha = System.Security.Cryptography.SHA256.Create();
    var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(templateBase64));
    return Convert.ToHexString(hash).ToLowerInvariant()[..16];
}

BridgeLogger.Info("bridge_ready", $"Listening on http://127.0.0.1:{builder.Configuration.GetValue<int>("Bridge:Port")}");

app.Run($"http://127.0.0.1:{builder.Configuration.GetValue<int>("Bridge:Port")}");
