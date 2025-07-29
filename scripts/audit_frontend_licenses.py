#!/usr/bin/env python
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

"""Audit the licenses of all our frontend dependencies (as defined by our
`yarn.lock` file). If any dependency has an unacceptable license, print it
out and exit with an error code. If all dependencies have acceptable licenses,
exit normally.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import NoReturn, Set, Tuple, cast

from typing_extensions import TypeAlias

PackageInfo: TypeAlias = Tuple[str, str]

SCRIPT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = SCRIPT_DIR.parent / "streamlit_pdf/frontend"

# Set of acceptable licenses. If a library uses one of these licenses,
# we can include it as a dependency.
ACCEPTABLE_LICENSES = {
    "MIT",  # https://opensource.org/licenses/MIT
    "Apache-2.0",  # https://opensource.org/licenses/Apache-2.0
    "Apache-2.0 WITH LLVM-exception",  # https://spdx.org/licenses/LLVM-exception.html
    "0BSD",  # https://opensource.org/licenses/0BSD
    "BlueOak-1.0.0",  # https://blueoakcouncil.org/license/1.0.0
    "BSD-2-Clause",  # https://opensource.org/licenses/BSD-2-Clause
    "BSD-3-Clause",  # https://opensource.org/licenses/BSD-3-Clause
    "ISC",  # https://opensource.org/licenses/ISC
    "CC0-1.0",  # https://creativecommons.org/publicdomain/zero/1.0/
    "CC-BY-3.0",  # https://creativecommons.org/licenses/by/3.0/
    "CC-BY-4.0",  # https://creativecommons.org/licenses/by/4.0/
    "Python-2.0",  # https://www.python.org/download/releases/2.0/license/
    "Zlib",  # https://opensource.org/licenses/Zlib
    "Unlicense",  # https://unlicense.org/
    "WTFPL",  # http://www.wtfpl.net/about/
    "BSD",  # https://opensource.org/license/bsd-1-clause
    # Multi-licenses are acceptable if at least one of the licenses is acceptable.
    "(MIT OR Apache-2.0)",
    "(MPL-2.0 OR Apache-2.0)",
    "(MIT OR CC0-1.0)",
    "(Apache-2.0 OR MPL-1.1)",
    "(BSD-3-Clause OR GPL-2.0)",
    "(MIT AND BSD-3-Clause)",
    "(MIT AND Zlib)",
    "(WTFPL OR MIT)",
    "(AFL-2.1 OR BSD-3-Clause)",
    "(BSD-2-Clause OR MIT OR Apache-2.0)",
    "Apache*",
    "(MIT OR GPL-3.0-or-later)",
    "Apache-2.0 AND MIT",
}

# Some of our dependencies have licenses that yarn fails to parse, but that
# are still acceptable. This set contains all those exceptions. Each entry
# should include a comment about why it's an exception.
PACKAGE_EXCEPTIONS: Set[PackageInfo] = {
    (
        # Apache license: https://github.com/google/flatbuffers/blob/v2.0.8/LICENSE.txt
        "flatbuffers@npm:2.0.4",
        "SEE LICENSE IN LICENSE.txt",
    ),
    (
        # Development use only, which is fine for this license
        "axe-core@npm:4.10.2",
        "MPL-2.0",
    ),
}


def get_license_type(package: PackageInfo) -> str:
    """Return the license type string for a dependency entry."""
    return package[1]


def check_licenses(licenses) -> NoReturn:
    # `yarn licenses` outputs a bunch of lines.
    # The last line contains the JSON object we care about
    packages = []
    for license in licenses:
        license_json = json.loads(license)

        # Skip warning messages from yarn
        if license_json.get("type") == "warning":
            continue

        # Skip lines that don't have the expected structure
        if "value" not in license_json:
            continue

        license_name = license_json["value"]
        for package_name in license_json["children"].keys():
            packages.append(cast(PackageInfo, (package_name, license_name)))

    # Discover dependency exceptions that are no longer used and can be
    # jettisoned, and print them out with a warning.
    unused_exceptions = PACKAGE_EXCEPTIONS.difference(set(packages))
    if len(unused_exceptions) > 0:
        for exception in sorted(list(unused_exceptions)):
            print(f"Unused package exception, please remove: {exception}")

    # Discover packages that don't have an acceptable license, and that don't
    # have an explicit exception. If we have any, we print them out and exit
    # with an error.
    bad_packages = [
        package
        for package in packages
        if (get_license_type(package) not in ACCEPTABLE_LICENSES)
        and (package not in PACKAGE_EXCEPTIONS)
        # workspace aggregator is yarn workspaces
        and "workspace-aggregator" not in package[0]
    ]

    if len(bad_packages) > 0:
        for package in bad_packages:
            print(f"Unacceptable license: '{get_license_type(package)}' (in {package})")
        print(f"{len(bad_packages)} unacceptable licenses")
        sys.exit(1)

    print(f"No unacceptable licenses: {len(packages)} checked")
    sys.exit(0)


def main() -> NoReturn:
    # Run `yarn licenses` for lib.
    licenses_output = (
        subprocess.check_output(
            ["yarn", "licenses", "list", "--json", "--production", "--recursive"],
            cwd=str(FRONTEND_DIR),
        )
        .decode()
        .splitlines()
    )

    check_licenses(licenses_output)


if __name__ == "__main__":
    main()
