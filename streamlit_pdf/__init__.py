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

import os
import streamlit.components.v1 as components
import streamlit as st
import io
from pathlib import Path
from typing import Union, Optional, Dict, Any


# Create a _RELEASE constant. We'll set this to False while we're developing
# the component, and True when we're ready to package and distribute it.
# (This is, of course, optional - there are innumerable ways to manage your
# release process.)
_DEV = os.environ.get("DEV", False)
_RELEASE = not _DEV

# Declare a Streamlit component for PDF viewing
if not _RELEASE:
    _component_func = components.declare_component(
        "pdf_viewer",
        url="http://localhost:3001",
    )
else:
    # When we're distributing a production version of the component, we'll
    # replace the `url` param with `path`, and point it to the component's
    # build directory:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")

    _component_func = components.declare_component("pdf_viewer", path=build_dir)


def pdf_viewer(
    file: Union[str, bytes, Path, io.BytesIO, io.RawIOBase, io.BufferedReader],
    height: int = 600,
    key: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create a new instance of the PDF viewer component.


    Parameters
    ----------
    file : str, bytes, Path, io.BytesIO, io.RawIOBase, or io.BufferedReader
        The PDF file to display. This can be:
        - A URL to a PDF file (e.g., "https://example.com/document.pdf")
        - A local file path (e.g., "./documents/sample.pdf")
        - Raw bytes of a PDF file
        - A pathlib.Path object pointing to a PDF file
        - A BytesIO object containing PDF data
        - A file-like object containing PDF data
        - Base64 encoded PDF data URI
    height : int, optional
        The height of the PDF viewer in pixels. Default is 600.
    key : str or None, optional
        An optional key that uniquely identifies this component. If this is
        None, and the component's arguments are changed, the component will
        be re-mounted in the Streamlit frontend and lose its current state.

    Returns
    -------
    None

    Examples
    --------
    Basic usage with a URL:
    >>> pdf_viewer("https://example.com/document.pdf")

    With custom height:
    >>> pdf_viewer(
    ...     file="./documents/report.pdf",
    ...     height=1000
    ... )

    Loading from bytes:
    >>> with open("document.pdf", "rb") as f:
    ...     pdf_bytes = f.read()
    >>> pdf_viewer(pdf_bytes)

    Loading from a Path object:
    >>> from pathlib import Path
    >>> pdf_viewer(Path("./documents/report.pdf"))

    Loading from a BytesIO object:
    >>> import io
    >>> with open("document.pdf", "rb") as f:
    ...     pdf_buffer = io.BytesIO(f.read())
    >>> pdf_viewer(pdf_buffer)
    """

    # Process the file parameter
    processed_file = _process_file_input(file)

    # Call the component function with processed arguments
    component_value = _component_func(
        file=processed_file, height=height, key=key, default=None
    )

    return component_value


def _process_file_input(
    file: Union[str, bytes, Path, io.BytesIO, io.RawIOBase, io.BufferedReader],
) -> str:
    """Process different types of file inputs into a format the frontend can handle.

    Parameters
    ----------
    file : str, bytes, Path, io.BytesIO, io.RawIOBase, or io.BufferedReader
        The input file in various formats

    Returns
    -------
    str
        A URL that the frontend can use to load the PDF
    """
    # Handle empty string case - return empty string to let frontend handle it
    if isinstance(file, str) and not file:
        return ""

    if isinstance(file, str) and (
        file.startswith(("http://", "https://", "data:application/pdf"))
    ):
        # For URLs and data URIs, use them directly
        return file
    else:
        # For local files or raw data, process and store in media file manager
        coordinates = st._main._get_delta_path_str()

        # Convert data to appropriate format
        data_or_filename: Union[bytes, str, None]
        if isinstance(file, (str, bytes)):
            # Pass strings and bytes through unchanged
            data_or_filename = file
        elif isinstance(file, Path):
            data_or_filename = str(file)
        elif isinstance(file, io.BytesIO):
            file.seek(0)
            data_or_filename = file.getvalue()
        elif isinstance(file, (io.RawIOBase, io.BufferedReader)):
            file.seek(0)
            data_or_filename = file.read()
        else:
            data_or_filename = None

        if data_or_filename is None:
            raise RuntimeError(f"Cannot process provided data of type: {type(file)}")

        # Add to media file manager
        from streamlit.runtime import Runtime

        runtime = Runtime.instance()
        pdf_url = runtime.media_file_mgr.add(
            data_or_filename, "application/pdf", coordinates
        )

        return pdf_url
