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

import streamlit as st

import streamlit_pdf

st.set_page_config(page_title="PDF Upload Viewer", page_icon="📄")

st.title("📄 Upload and View PDF")
st.markdown("Select a PDF file to display it below.")

# Height control for the viewer
height = st.slider("Height", 400, 1000, 600)

# File uploader for PDF files
uploaded_file = st.file_uploader("Choose a PDF file", type=["pdf"])

if uploaded_file is not None:
    # Read file bytes from the uploaded file so the component can ingest them
    file_bytes = uploaded_file.read()
    streamlit_pdf.pdf_viewer(file=file_bytes, height=height, key="pdf_viewer_upload")
else:
    st.info("Upload a PDF file to view it here.")
