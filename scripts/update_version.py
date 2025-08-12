# Copyright 2025 Snowflake Inc.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Script to update version numbers across the streamlit-pdf project.
Updates version in pyproject.toml, package.json, and test requirements.
"""

import json
import re
import subprocess
import sys
from pathlib import Path


def update_pyproject_toml(version: str, project_root: Path) -> None:
    """Update version in pyproject.toml"""
    pyproject_file = project_root / "pyproject.toml"
    content = pyproject_file.read_text()

    # Update version line
    updated_content = re.sub(
        r'^version = ".*"', f'version = "{version}"', content, flags=re.MULTILINE
    )

    pyproject_file.write_text(updated_content)
    print(f"✅ Updated pyproject.toml: {version}")


def update_package_json(version: str, project_root: Path) -> None:
    """Update version in frontend package.json"""
    package_json_file = project_root / "streamlit_pdf" / "frontend" / "package.json"

    with open(package_json_file, "r") as f:
        package_data = json.load(f)

    package_data["version"] = version

    with open(package_json_file, "w") as f:
        json.dump(package_data, f, indent=2)
        f.write("\n")  # Add trailing newline

    print(f"✅ Updated package.json: {version}")


def update_test_requirements(version: str, project_root: Path) -> None:
    """Update version in e2e test requirements"""
    test_req_file = project_root / "e2e_playwright" / "test-requirements.txt"
    content = test_req_file.read_text()

    # Update the wheel file reference
    updated_content = re.sub(
        r"dist/streamlit_pdf-.*-py3-none-any\.whl",
        f"dist/streamlit_pdf-{version}-py3-none-any.whl",
        content,
    )

    test_req_file.write_text(updated_content)
    print(f"✅ Updated test-requirements.txt: {version}")


def run_npm_install(project_root: Path) -> None:
    """Run npm install in the frontend directory to update package-lock.json"""
    frontend_dir = project_root / "streamlit_pdf" / "frontend"

    print(f"📦 Running npm install in {frontend_dir.relative_to(project_root)}...")

    try:
        # Run npm install in the frontend directory
        subprocess.run(
            ["npm", "install"],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            check=True,
        )
        print("✅ Successfully ran npm install and updated package-lock.json")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Failed to run npm install: {e}")
        print(f"    stdout: {e.stdout}")
        print(f"    stderr: {e.stderr}")
        print(
            "    You may need to run 'npm install' manually in streamlit_pdf/frontend/"
        )
    except FileNotFoundError:
        print("⚠️  npm not found. Please ensure npm is installed and in your PATH.")
        print(
            "    You'll need to run 'npm install' manually in streamlit_pdf/frontend/"
        )


def validate_version(version: str) -> bool:
    """Validate that version follows semantic versioning pattern"""
    pattern = r"^\d+\.\d+\.\d+$"
    return bool(re.match(pattern, version))


def get_current_version(project_root: Path) -> str:
    """Get current version from pyproject.toml"""
    pyproject_file = project_root / "pyproject.toml"
    content = pyproject_file.read_text()

    match = re.search(r'^version = "(.*)"', content, re.MULTILINE)
    if match:
        return match.group(1)
    else:
        raise ValueError("Could not find version in pyproject.toml")


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/update_version.py <new_version>")
        print("Example: python scripts/update_version.py 1.0.1")
        sys.exit(1)

    new_version = sys.argv[1]

    if not validate_version(new_version):
        print(f"❌ Invalid version format: {new_version}")
        print("Version must follow semantic versioning (e.g., 1.0.1)")
        sys.exit(1)

    project_root = Path(__file__).parent.parent

    try:
        current_version = get_current_version(project_root)
        print(f"🔄 Updating version from {current_version} to {new_version}")

        # Update all files
        update_pyproject_toml(new_version, project_root)
        update_package_json(new_version, project_root)
        update_test_requirements(new_version, project_root)

        # Run npm install to update package-lock.json
        run_npm_install(project_root)

        print(f"\n🎉 Successfully updated all version references to {new_version}")
        print("\nNext steps:")
        print("1. Commit the changes")
        print("2. Create/update your release PR")

    except Exception as e:
        print(f"❌ Error updating version: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
