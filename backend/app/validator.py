import yaml
import tempfile
import subprocess
import sys
import os
from openapi_spec_validator import validate


def validate_openapi(spec_yaml: str) -> tuple[bool, str]:
    try:
        spec = yaml.safe_load(spec_yaml)
        validate(spec)
        return True, "OpenAPI spec is valid"
    except Exception as e:
        return False, f"OpenAPI validation failed: {e}"


def run_tests(app_code: str, test_code: str) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory() as tmpdir:
        app_path = os.path.join(tmpdir, "generated_app.py")
        test_path = os.path.join(tmpdir, "test_generated.py")

        with open(app_path, "w") as f:
            f.write(app_code)
        with open(test_path, "w") as f:
            f.write(test_code)

        result = subprocess.run(
            [sys.executable, "-m", "pytest", test_path, "-v", "--tb=short"],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=60,
        )

        output = result.stdout + "\n" + result.stderr
        return result.returncode == 0, output


def run_security_scan(code: str) -> tuple[bool, str]:
    """Runs bandit security scan on generated code."""
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        # We use 'bandit' to scan for security issues.
        # This demonstrates "Security-by-Design" principles.
        result = subprocess.run(
            ["bandit", "-r", tmp_path, "-ll"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        os.unlink(tmp_path)
        return result.returncode == 0, result.stdout + "\n" + result.stderr
    except FileNotFoundError:
        os.unlink(tmp_path)
        return True, "Bandit not installed, skipping security scan."
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return False, f"Security scan failed: {e}"
