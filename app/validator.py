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
