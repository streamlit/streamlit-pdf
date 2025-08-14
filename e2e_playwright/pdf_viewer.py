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


import base64
import io
from pathlib import Path

import streamlit_pdf

try:
    import streamlit as st
except ImportError as e:
    raise RuntimeError(
        "streamlit-pdf requires Streamlit at runtime. "
        "Install either 'streamlit', e.g.:\n"
        "  pip install streamlit\n"
        "or install the extra:\n"
        "  pip install streamlit-pdf[with-streamlit]"
    ) from e


st.set_page_config(page_title="PDF Viewer Example", page_icon="📄")

st.title("📄 PDF Viewer Component")
st.markdown("This is a demonstration of the Streamlit PDF viewer component.")

# Create columns for options
col1, col2 = st.columns(2)

with col1:
    height = st.slider("Height", 400, 1000, 600)

with col2:
    file_type = st.selectbox(
        "Select file type to test:",
        ["Bytes", "Path", "BytesIO", "BufferedReader", "File Path String", "Data URI"],
        key="file_type_selector",
    )

# Create a sample PDF file path
sample_pdf_path = Path(__file__).parent / "sample.pdf"

st.subheader(f"PDF Viewer - {file_type}")

if file_type == "Bytes":
    with open(sample_pdf_path, "rb") as pdf_file:
        pdf_data = pdf_file.read()
    streamlit_pdf.pdf_viewer(file=pdf_data, height=height, key="pdf_viewer_single")

elif file_type == "Path":
    streamlit_pdf.pdf_viewer(
        file=sample_pdf_path, height=height, key="pdf_viewer_single"
    )

elif file_type == "BytesIO":
    with open(sample_pdf_path, "rb") as pdf_file:
        pdf_buffer = io.BytesIO(pdf_file.read())
    streamlit_pdf.pdf_viewer(file=pdf_buffer, height=height, key="pdf_viewer_single")

elif file_type == "BufferedReader":
    with open(sample_pdf_path, "rb") as pdf_file:
        streamlit_pdf.pdf_viewer(file=pdf_file, height=height, key="pdf_viewer_single")

elif file_type == "File Path String":
    streamlit_pdf.pdf_viewer(
        file=str(sample_pdf_path), height=height, key="pdf_viewer_single"
    )

elif file_type == "Data URI":
    with open(sample_pdf_path, "rb") as pdf_file:
        pdf_bytes = pdf_file.read()
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        data_uri = f"data:application/pdf;base64,{pdf_base64}"
    streamlit_pdf.pdf_viewer(file=data_uri, height=height, key="pdf_viewer_single")
