namespace Bridge.Host.Models;

public record DeviceInfo
{
    public string Name { get; init; } = string.Empty;
    public string VendorId { get; init; } = string.Empty;
    public string ProductId { get; init; } = string.Empty;
    public string Serial { get; init; } = string.Empty;
    public string DriverVersion { get; init; } = string.Empty;
    public string SdkVersion { get; init; } = string.Empty;
}

public record ScannerStatus
{
    public bool Connected { get; init; }
    public string Mode { get; init; } = string.Empty;
    public string State { get; init; } = "unknown";
    public DeviceInfo Device { get; init; } = new();
    public int UptimeSeconds { get; init; }
}

public record EnrollResult
{
    public string Template { get; init; } = string.Empty;
    public string Platform { get; init; } = string.Empty;
    public int QualityScore { get; init; }
    public int CaptureCount { get; init; }
    public string Status { get; init; } = string.Empty;
}

public record VerifyRequest
{
    public string Template { get; init; } = string.Empty;
    public string Platform { get; init; } = string.Empty;
}

public record VerifyResult
{
    public bool Match { get; init; }
    public int Score { get; init; }
    public int LatencyMs { get; init; }
    public int Quality { get; init; }
    public string? Error { get; init; }
}

public record SdkHealth
{
    public bool Installed { get; init; }
    public string Version { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
}

public record ScannerHealth
{
    public bool Connected { get; init; }
    public string VendorId { get; init; } = string.Empty;
    public string ProductId { get; init; } = string.Empty;
    public string DriverVersion { get; init; } = string.Empty;
}

public record CryptoHealth
{
    public bool SecretConfigured { get; init; }
}

public record BridgeHealth
{
    public string Version { get; init; } = string.Empty;
    public int UptimeSeconds { get; init; }
    public int MemoryMb { get; init; }
}

public record HealthReport
{
    public string Mode { get; init; } = string.Empty;
    public bool SdkInstalled { get; init; }
    public bool ScannerConnected { get; init; }
    public bool SecretConfigured { get; init; }
    public SdkHealth Sdk { get; init; } = new();
    public ScannerHealth Scanner { get; init; } = new();
    public CryptoHealth Crypto { get; init; } = new();
    public BridgeHealth Bridge { get; init; } = new();
}

public record DiagnosticReport
{
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    public string Mode { get; init; } = string.Empty;
    public List<DiagnosticCheck> Checks { get; init; } = new();
    public bool AllPassed { get; init; }
}

public record DiagnosticCheck
{
    public string Name { get; init; } = string.Empty;
    public bool Passed { get; init; }
    public string Detail { get; init; } = string.Empty;
}
