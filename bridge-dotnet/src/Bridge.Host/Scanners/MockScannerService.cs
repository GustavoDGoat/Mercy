using System.Security.Cryptography;
using Bridge.Host.Models;

namespace Bridge.Host.Scanners;

public enum ScannerMode { Mock, Real }

public class MockScannerService : IScannerService
{
    private readonly object _lock = new();
    private bool _isScanning;
    private bool _cancelled;
    private string _currentFingerId = Guid.NewGuid().ToString("N")[..12];
    private readonly DateTime _startedAt = DateTime.UtcNow;
    private int _captureCount;
    private const string PlatformTag = "win_dpsdk";
    private const string MockTemplatePrefix = "MOCK:v2:";

    public ScannerStatus GetStatus()
    {
        return new ScannerStatus
        {
            Connected = true,
            Mode = ScannerMode.Mock,
            State = _isScanning ? "scanning" : "idle",
            Device = new DeviceInfo
            {
                Name = "Mock Scanner (DP SDK not installed — real scanning unavailable)",
                VendorId = "05ba",
                ProductId = "000a",
                Serial = "mock-serial-001",
                DriverVersion = "n/a (mock mode)",
                SdkVersion = "n/a (mock mode)"
            },
            UptimeSeconds = (int)(DateTime.UtcNow - _startedAt).TotalSeconds
        };
    }

    public Task<EnrollResult> EnrollAsync(CancellationToken ct)
    {
        lock (_lock)
        {
            if (_isScanning)
                throw new InvalidOperationException("Scanner is busy with another operation.");

            _isScanning = true;
            _cancelled = false;
        }

        try
        {
            return Task.Run(async () =>
            {
                _currentFingerId = Guid.NewGuid().ToString("N")[..12];

                for (int i = 1; i <= 4; i++)
                {
                    if (_cancelled) throw new OperationCanceledException(ct);
                    await Task.Delay(1200, ct);
                    if (_cancelled) throw new OperationCanceledException(ct);
                    if (i < 4) await Task.Delay(800, ct);
                }

                var qualityScore = RandomNumberGenerator.GetInt32(80, 96);
                var nonce = Guid.NewGuid().ToString("N")[..8];
                var payload = $"{_currentFingerId}|{qualityScore}|4|{nonce}";
                var template = MockTemplatePrefix + Convert.ToBase64String(
                    System.Text.Encoding.UTF8.GetBytes(payload));

                Interlocked.Increment(ref _captureCount);

                return new EnrollResult
                {
                    Template = template,
                    Platform = PlatformTag,
                    QualityScore = qualityScore,
                    CaptureCount = 4,
                    Status = "complete"
                };
            }, ct);
        }
        finally
        {
            lock (_lock) { _isScanning = false; }
        }
    }

    public Task<VerifyResult> VerifyAsync(string templateBase64, string platformTag, CancellationToken ct)
    {
        lock (_lock)
        {
            if (_isScanning)
                throw new InvalidOperationException("Scanner is busy with another operation.");

            _isScanning = true;
            _cancelled = false;
        }

        try
        {
            return Task.Run(async () =>
            {
                if (_cancelled) throw new OperationCanceledException(ct);

                if (platformTag != PlatformTag)
                {
                    return new VerifyResult
                    {
                        Match = false,
                        Score = 0,
                        LatencyMs = 0,
                        Quality = 0,
                        Error = $"Platform mismatch: enrolled on '{platformTag}', this kiosk is '{PlatformTag}'."
                    };
                }

                if (!templateBase64.StartsWith(MockTemplatePrefix))
                {
                    return new VerifyResult
                    {
                        Match = false,
                        Score = 0,
                        LatencyMs = 0,
                        Quality = 0,
                        Error = "Cannot verify non-mock template in mock mode. Install DP SDK for real templates."
                    };
                }

                await Task.Delay(800, ct);
                if (_cancelled) throw new OperationCanceledException(ct);

                string storedFingerId;
                try
                {
                    var raw = Convert.FromBase64String(templateBase64[MockTemplatePrefix.Length..]);
                    storedFingerId = System.Text.Encoding.UTF8.GetString(raw).Split('|')[0];
                }
                catch
                {
                    return new VerifyResult
                    {
                        Match = false,
                        Score = 0,
                        LatencyMs = 812,
                        Quality = 0,
                        Error = "Invalid template data — corrupted or wrong format."
                    };
                }

                var match = storedFingerId == _currentFingerId;
                var score = match
                    ? RandomNumberGenerator.GetInt32(92, 100)
                    : RandomNumberGenerator.GetInt32(5, 25);
                var quality = match
                    ? RandomNumberGenerator.GetInt32(80, 95)
                    : RandomNumberGenerator.GetInt32(20, 45);

                return new VerifyResult
                {
                    Match = match,
                    Score = score,
                    LatencyMs = 812,
                    Quality = quality
                };
            }, ct);
        }
        finally
        {
            lock (_lock) { _isScanning = false; }
        }
    }

    public void Cancel()
    {
        lock (_lock)
        {
            _cancelled = true;
            _isScanning = false;
        }
    }

    public void Restart()
    {
        lock (_lock)
        {
            _cancelled = false;
            _isScanning = false;
            _currentFingerId = Guid.NewGuid().ToString("N")[..12];
        }
    }

    public HealthReport GetHealth()
    {
        return new HealthReport
        {
            Mode = ScannerMode.Mock,
            SdkInstalled = false,
            ScannerConnected = true,
            SecretConfigured = SystemChecks.IsSecretConfigured(),
            Sdk = new SdkHealth
            {
                Installed = false,
                Version = "n/a",
                Path = "n/a"
            },
            Scanner = new ScannerHealth
            {
                Connected = true,
                VendorId = "05ba",
                ProductId = "000a",
                DriverVersion = "n/a (mock)"
            },
            Crypto = new CryptoHealth
            {
                SecretConfigured = SystemChecks.IsSecretConfigured()
            },
            Bridge = new BridgeHealth
            {
                Version = "1.0.0",
                UptimeSeconds = (int)(DateTime.UtcNow - _startedAt).TotalSeconds,
                MemoryMb = (int)(GC.GetTotalMemory(false) / 1024 / 1024)
            }
        };
    }
}
