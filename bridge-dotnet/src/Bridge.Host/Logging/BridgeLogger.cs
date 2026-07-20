using System.Text.Json;

namespace Bridge.Host.Logging;

public enum LogLevel { Debug, Information, Warning, Error }

public record LogEntry
{
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    public LogLevel Level { get; init; }
    public string Event { get; init; } = string.Empty;
    public string? Detail { get; init; }
    public string? Exception { get; init; }
}

public static class BridgeLogger
{
    private static readonly object _lock = new();
    private static string? _logFilePath;
    private static bool _logToConsole = true;
    private static bool _logToFile;

    public static void Initialize(string logFilePath, bool logToConsole = true, bool logToFile = true)
    {
        _logFilePath = logFilePath;
        _logToConsole = logToConsole;
        _logToFile = logToFile;

        if (_logToFile && !string.IsNullOrWhiteSpace(logFilePath))
        {
            var dir = Path.GetDirectoryName(logFilePath);
            if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);
        }
    }

    public static void Log(LogLevel level, string evt, string? detail = null, Exception? ex = null)
    {
        var entry = new LogEntry
        {
            Level = level,
            Event = evt,
            Detail = detail,
            Exception = ex?.ToString()
        };

        var json = JsonSerializer.Serialize(entry);

        if (_logToConsole)
        {
            Console.WriteLine(json);
        }

        if (_logToFile && !string.IsNullOrWhiteSpace(_logFilePath))
        {
            lock (_lock)
            {
                File.AppendAllText(_logFilePath, json + Environment.NewLine);
            }
        }
    }

    public static void Info(string evt, string? detail = null)
        => Log(LogLevel.Information, evt, detail);

    public static void Warn(string evt, string? detail = null)
        => Log(LogLevel.Warning, evt, detail);

    public static void Error(string evt, Exception? ex = null, string? detail = null)
        => Log(LogLevel.Error, evt, detail: detail, ex: ex);

    public static void Debug(string evt, string? detail = null)
        => Log(LogLevel.Debug, evt, detail);
}
