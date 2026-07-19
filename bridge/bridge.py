#!/usr/bin/env python3
"""
SLMS Fingerprint Bridge — talks to USB fingerprint scanner via localhost HTTP.
Linux: libfprint via gi.repository.Fprint
Windows: Digital Persona SDK via subprocess/COM
Runs on http://localhost:9876
"""

import json
import base64
import platform
import threading
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 9876
BUSY_LOCK = threading.Lock()
_SCANNER = None


def get_scanner():
    global _SCANNER
    if _SCANNER is None:
        os_name = platform.system()
        try:
            if os_name == "Linux":
                _SCANNER = LinuxScanner()
            elif os_name == "Windows":
                _SCANNER = WindowsScanner()
            else:
                _SCANNER = NoScanner(f"Unsupported OS: {os_name}")
        except Exception as e:
            _SCANNER = NoScanner(f"Scanner init failed: {e}")
    return _SCANNER


class NoScanner:
    def __init__(self, reason="No scanner configured"):
        self._reason = reason

    def status(self):
        return {"connected": False, "platform": platform.system(), "reason": self._reason}

    def enroll(self):
        raise RuntimeError(self._reason)

    def verify(self, template_b64, platform_tag):
        raise RuntimeError(self._reason)


class LinuxScanner:
    def __init__(self):
        import gi
        gi.require_version("Fprint", "2.0")
        from gi.repository import Fprint, GLib

        self.Fprint = Fprint
        self.GLib = GLib
        self._ctx = Fprint.Context()
        self._ctx.enumerate()
        devices = self._ctx.get_devices()
        if not devices:
            raise RuntimeError("No fingerprint devices found")
        self._device = devices[0]
        self._device.open_sync()
        self._platform_tag = "linux_libfprint"

    def status(self):
        return {
            "connected": True,
            "platform": self._platform_tag,
            "device": self._device.get_name() if hasattr(self._device, "get_name") else "unknown",
        }

    def enroll(self):
        loop = self.GLib.MainLoop()
        template = self.Fprint.Print.new(self._device)
        result = {"template": None, "error": None, "progress": "starting"}

        def on_progress(current, total):
            pass

        def on_done(dev, res):
            try:
                ok, new_template, err = dev.enroll_finish(res)
                if ok == self.Fprint.EnrollResult.COMPLETE and new_template is not None:
                    result["template"] = base64.b64encode(new_template.serialize()).decode()
                    result["progress"] = "complete"
            except Exception as e:
                result["error"] = str(e)
            finally:
                loop.quit()

        self._device.enroll(template, None, on_progress, None, on_done)

        timeout_id = self.GLib.timeout_add_seconds(120, lambda: loop.quit())
        loop.run()
        self.GLib.source_remove(timeout_id)

        if result["error"]:
            raise RuntimeError(result["error"])
        if result["template"] is None:
            raise RuntimeError("Enrollment failed: no template captured")
        return {"template": result["template"], "platform": self._platform_tag}

    def verify(self, template_b64, platform_tag):
        if platform_tag != self._platform_tag:
            raise RuntimeError(
                f"Platform mismatch: enrolled on '{platform_tag}', "
                f"this kiosk is '{self._platform_tag}'. Please use the same type of kiosk."
            )

        loop = self.GLib.MainLoop()
        result = {"match": False, "score": 0, "error": None}

        try:
            raw = base64.b64decode(template_b64)
            stored = self.Fprint.Print.deserialize(raw)
        except Exception as e:
            raise RuntimeError(f"Invalid template data: {e}")

        template = self.Fprint.Print.new(self._device)

        def on_done(dev, res):
            try:
                ok, new_template, new_print, err = dev.verify_finish(res)
                if ok == self.Fprint.VerifyResult.MATCH:
                    result["match"] = True
                    result["score"] = 100
                elif ok == self.Fprint.VerifyResult.NO_MATCH:
                    result["match"] = False
                    result["score"] = 0
                else:
                    result["error"] = f"Verify error: {err}"
            except Exception as e:
                result["error"] = str(e)
            finally:
                loop.quit()

        self._device.verify(template, stored, None, None, None, on_done)

        timeout_id = self.GLib.timeout_add_seconds(30, lambda: loop.quit())
        loop.run()
        self.GLib.source_remove(timeout_id)

        if result["error"]:
            raise RuntimeError(result["error"])
        return result

    def close(self):
        try:
            self._device.close_sync()
        except Exception:
            pass


class WindowsScanner:
    def __init__(self):
        self._dll_path = self._find_dp_sdk()
        self._platform_tag = "win_dpsdk"

    def _find_dp_sdk(self):
        import os as _os
        paths = [
            _os.path.join(_os.environ.get("SystemRoot", "C:\\Windows"), "System32", "dpfpdd.dll"),
            _os.path.join(_os.environ.get("SystemRoot", "C:\\Windows"), "SysWOW64", "dpfpdd.dll"),
            _os.path.join(_os.environ.get("ProgramFiles", "C:\\Program Files"), "DigitalPersona", "Bin", "dpfpdd.dll"),
            _os.path.join(_os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "DigitalPersona", "Bin", "dpfpdd.dll"),
        ]
        for p in paths:
            if _os.path.exists(p):
                return p
        raise RuntimeError(
            "Digital Persona SDK not found. "
            "Please install the DP SDK from the scanner CD or download from HID Global."
        )

    def status(self):
        return {
            "connected": True,
            "platform": self._platform_tag,
            "device": "Digital Persona 4500",
        }

    def enroll(self):
        raise NotImplementedError(
            "Windows DP SDK enrollment requires pythonnet or pywin32. "
            "Install with: pip install pythonnet"
        )

    def verify(self, template_b64, platform_tag):
        raise NotImplementedError(
            "Windows DP SDK verification requires pythonnet or pywin32. "
            "Install with: pip install pythonnet"
        )


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw)

    def do_OPTIONS(self):
        self._cors()

    def do_GET(self):
        if self.path == "/status":
            try:
                s = get_scanner()
                self._json(200, s.status())
            except Exception as e:
                self._json(500, {"connected": False, "error": str(e)})
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/enroll":
            acquired = BUSY_LOCK.acquire(blocking=False)
            if not acquired:
                self._json(409, {"error": "Scanner busy. Another scan is in progress."})
                return
            try:
                s = get_scanner()
                result = s.enroll()
                self._json(200, result)
            except Exception as e:
                self._json(500, {"error": str(e)})
            finally:
                BUSY_LOCK.release()

        elif self.path == "/verify":
            acquired = BUSY_LOCK.acquire(blocking=False)
            if not acquired:
                self._json(409, {"error": "Scanner busy. Another scan is in progress."})
                return
            try:
                body = self._read_body()
                template = body.get("template", "")
                platform_tag = body.get("platform", "")
                if not template:
                    self._json(400, {"error": "Missing 'template' in request body"})
                    return
                s = get_scanner()
                result = s.verify(template, platform_tag)
                self._json(200, result)
            except Exception as e:
                self._json(500, {"error": str(e)})
            finally:
                BUSY_LOCK.release()

        else:
            self._json(404, {"error": "Not found"})


def main():
    server = HTTPServer(("127.0.0.1", PORT), BridgeHandler)
    print(f"[bridge] SLMS Fingerprint Bridge running on http://localhost:{PORT}")
    print(f"[bridge] Platform: {platform.system()}")
    try:
        s = get_scanner()
        print(f"[bridge] Scanner: {s.status()}")
    except Exception as e:
        print(f"[bridge] Scanner unavailable: {e}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[bridge] Shutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
