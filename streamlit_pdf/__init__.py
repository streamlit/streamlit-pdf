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

import io
from pathlib import Path
from typing import Any, Dict, Optional, Union

# Streamlit is an optional runtime dependency. We avoid importing it at module import
# time so that simply importing this package does not require Streamlit to be
# installed. We will raise a clear error message if a runtime entrypoint is used
# without Streamlit being present.
try:
    import streamlit as st  # type: ignore

    _STREAMLIT_AVAILABLE = True
except Exception:  # pragma: no cover - only hits when Streamlit is absent
    st = None  # type: ignore
    _STREAMLIT_AVAILABLE = False


def _raise_streamlit_required() -> None:
    raise RuntimeError(
        "streamlit-pdf requires Streamlit at runtime. "
        "Install either 'streamlit', e.g.:\n"
        "  pip install streamlit\n"
        "or install the extra:\n"
        "  pip install streamlit-pdf[with-streamlit]"
    )


if _STREAMLIT_AVAILABLE:
    _component_func = st.components.v2.component(
        name="streamlit-pdf.pdf_viewer",
        js="assets/index-*.js",
        css="assets/index-*.css",
        html='<div class="react-root"></div>',
    )
else:

    def _component_func(**_kwargs):  # type: ignore
        _raise_streamlit_required()


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

    # Mount the CCv2 component with data payload
    _component_func(
        key=key,
        data={
            "file": processed_file,
            "height": height,
        },
    )

    return None


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
    # Ensure Streamlit is available at runtime
    if not _STREAMLIT_AVAILABLE:
        _raise_streamlit_required()

    assert st is not None  # for type checkers

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
        from streamlit import runtime

        if runtime.exists():
            pdf_url = runtime.get_instance().media_file_mgr.add(
                data_or_filename, "application/pdf", coordinates
            )
            return pdf_url

        # When running in "bare execution", we can't access the MediaFileManager.
        return ""
