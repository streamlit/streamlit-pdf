# streamlit-pdf

A lightweight **Streamlit** feature that seamlessly displays **PDF** files in your apps, allowing for simple, responsive, and clean document viewing with minimal effort.

---

## 📦 Installation

```bash
pip install streamlit[pdf]
```

Ensure you have **Streamlit** installed:

---

## 💡 Usage

Here's how to display a PDF file in your Streamlit app:

```python
import streamlit as st

# Display PDF from URL
st.pdf("https://example.com/document.pdf")

# Display with custom height
st.pdf("path/to/document.pdf", height=600)

# Display uploaded file
uploaded_file = st.file_uploader("Choose a PDF file", type="pdf")
if uploaded_file is not None:
    st.pdf(uploaded_file)
```

---

## ⚙️ API Reference

### `st.pdf(data, height=600)`

#### Parameters:

- **`data`** (_str | Path | bytes | BytesIO_): The PDF file to show. This can be one of the following:

  - A URL (string) for a hosted PDF file (`"https://example.com/doc.pdf"`)
  - A path to a local PDF file (`"./documents/sample.pdf"`)
  - A file-like object, e.g. a file opened with `open` or an `UploadedFile` returned by `st.file_uploader`
  - Raw bytes data

- **`height`** (_int_, optional): Height of the PDF viewer in pixels. Default: 600

---

## 🖼️ Examples

### Basic PDF Display

```python
import streamlit as st

st.title("PDF Viewer Example")

# Display a PDF from URL
st.pdf("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
```

### File Upload with PDF Display

```python
import streamlit as st

st.title("Upload and View PDF")

uploaded_file = st.file_uploader("Choose a PDF file", type="pdf")
if uploaded_file is not None:
    st.pdf(uploaded_file)
```

### Custom Height

```python
import streamlit as st

# Display PDF with specific height
st.pdf("document.pdf", height=800)

# Display PDF with default height
st.pdf("document.pdf")
```

### Reading from Local File

```python
import streamlit as st

with open("document.pdf", "rb") as file:
    st.pdf(file.read(), height=700)
```

---

## 📝 Contributing

Feel free to file issues in [our Streamlit Repository](https://github.com/streamlit/streamlit/issues/new/choose).

Contributions are welcome 🚀, however, please inform us before building a feature.

---
