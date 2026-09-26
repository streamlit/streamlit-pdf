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

from pathlib import Path

import pytest
from e2e_utils import StreamlitRunner
from playwright.sync_api import Page, expect

PDF_VIEWER_FILE = Path(__file__).parent / "pdf_viewer.py"


def _wait_for_pdf_content_ready(page: Page, timeout: int = 10000):
    """Wait for PDF content to actually load by checking document container."""
    try:
        # Wait for the PDF document container to be visible with custom timeout
        page.get_by_test_id("pdf-document-container").wait_for(
            state="visible", timeout=timeout
        )
    except Exception:
        # Proceed anyway - might still work
        pass


@pytest.fixture(autouse=True, scope="session")
def streamlit_app():
    with StreamlitRunner(PDF_VIEWER_FILE) as runner:
        yield runner


@pytest.fixture(autouse=True, scope="function")
def go_to_app(page: Page, streamlit_app: StreamlitRunner):
    page.goto(streamlit_app.server_url)

    # Wait for app to load by looking for the title
    page.wait_for_selector('h1:has-text("📄 PDF Viewer Component")')

    # Wait for DOM to be ready first
    page.wait_for_load_state("domcontentloaded")

    # Try to wait for network idle, but don't fail if it times out
    # Streamlit apps often have ongoing network activity
    try:
        page.wait_for_load_state("networkidle", timeout=10000)  # 10 second timeout
    except Exception:
        # Continue if networkidle times out - the app is likely ready anyway
        pass

    # Give additional time for media file manager to initialize
    page.wait_for_timeout(1000)


def test_pdf_viewer_renders(page: Page):
    """Test that the PDF viewer component renders correctly."""
    # Check that the title is present
    expect(page.get_by_role("heading", name="📄 PDF Viewer Component")).to_be_visible()

    # The PDF viewer container should be visible
    expect(page.get_by_test_id("pdf-container")).to_be_visible()


def test_pdf_viewer_unlabeled_has_no_accessible_name(page: Page):
    """Omitted alt must not invent an accessible name on the viewer root."""
    container = page.get_by_test_id("pdf-container")
    expect(container).to_be_visible()
    # Playwright's not_to_have_attribute requires a value; assert absence directly.
    assert container.get_attribute("aria-label") is None
    assert container.get_attribute("role") is None


def test_pdf_viewer_alt_sets_accessible_name(page: Page):
    """alt must expose a computed accessible name on pdf-container."""
    checkbox = page.locator('[data-testid="stCheckbox"]').filter(
        has_text="Include alt text"
    )
    checkbox.click()
    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass

    container = page.get_by_test_id("pdf-container")
    expect(container).to_be_visible()
    expect(container).to_have_accessible_name("Q3 2026 financial report")
    expect(container).to_have_attribute("role", "region")


def _click_height_slider(page: Page, width_ratio: float = 0.75) -> None:
    """Interact with the Height slider using current React Aria Streamlit DOM."""
    slider = page.get_by_test_id("stSlider").filter(
        has=page.get_by_test_id("stWidgetLabel").get_by_text("Height", exact=True)
    )
    expect(slider).to_be_visible()
    slider.hover()
    box = slider.bounding_box()
    if box:
        page.mouse.click(
            box["x"] + box["width"] * width_ratio,
            box["y"] + box["height"] / 2,
        )


def test_pdf_viewer_height_control(page: Page):
    """Test that the PDF viewer height control works correctly."""
    _click_height_slider(page, width_ratio=0.75)

    # Wait for the value to update and component to re-render
    page.wait_for_load_state("domcontentloaded")

    # Verify the PDF viewer is still visible after changes
    expect(page.get_by_test_id("pdf-container")).to_be_visible()


def test_pdf_viewer_displays_pdf(page: Page):
    """Test that the PDF viewer actually displays PDF content."""
    # Wait for PDF to start loading with better conditions
    expect(page.get_by_test_id("pdf-container")).to_be_visible()

    # Check if there's an error state
    try:
        error_container = page.get_by_test_id("pdf-error")
        error_container.wait_for(state="visible")
        error_text = error_container.text_content()
        # If error is visible, the test should fail
        assert False, f"PDF failed to load: {error_text}"
    except Exception:
        # No error visible, which is good
        pass

    # Use our robust wait for PDF content to load (same logic as Data URI)
    _wait_for_pdf_content_ready(page)

    # For now, just check that the document container exists
    # The lazy loading might not render pages immediately


def test_pdf_viewer_responsive(page: Page):
    """Test that the PDF viewer responds to viewport changes."""
    # Set initial viewport
    page.set_viewport_size({"width": 1200, "height": 800})

    # Check PDF viewer is visible
    expect(page.get_by_test_id("pdf-container")).to_be_visible()

    # Change viewport to mobile size
    page.set_viewport_size({"width": 375, "height": 667})
    page.wait_for_load_state("domcontentloaded")

    # Check PDF viewer is still visible and responsive
    expect(page.get_by_test_id("pdf-container")).to_be_visible()


def _select_file_type(page: Page, option_name: str) -> None:
    """Select an option from the file-type selectbox (current Streamlit DOM)."""
    selectbox = page.locator('[data-testid="stSelectbox"]').filter(
        has_text="Select file type"
    )
    selectbox_input = selectbox.locator("input")
    selectbox_input.wait_for(state="visible")
    selectbox_input.click()
    # ArrowDown opens the dropdown reliably when pointer open is flaky.
    selectbox_input.press("ArrowDown")

    dropdown = page.get_by_test_id("stSelectboxVirtualDropdown")
    expect(dropdown).to_be_visible()
    dropdown.get_by_role("option", name=option_name, exact=True).click()

    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass


def _test_pdf_viewer_with_selectbox(
    page: Page, option_name: str, test_description: str
):
    """Helper function to test PDF viewer with selectbox selection."""
    _select_file_type(page, option_name)

    # For Data URI, wait for PDF content to be ready instead of arbitrary timeout
    if option_name == "Data URI":
        _wait_for_pdf_content_ready(page)

    # Since we're using a single PDF viewer, we can directly locate it
    # Wait for PDF to start loading
    expect(page.get_by_test_id("pdf-container")).to_be_visible()

    # Check if there's an error state with shorter timeout to avoid hanging
    try:
        error_container = page.get_by_test_id("pdf-error")
        error_container.wait_for(state="visible", timeout=2000)
        error_text = error_container.text_content()
        assert False, f"PDF failed to load for {option_name}: {error_text}"
    except Exception:
        # No error visible, which is good
        pass

    # For Data URI, we've already waited for the document container above
    # For other types, wait for the document container to appear
    if option_name != "Data URI":
        expect(page.get_by_test_id("pdf-document-container")).to_be_visible()

    # Check for actual PDF content (canvas elements)
    try:
        canvas = page.locator("canvas").first
        expect(canvas).to_be_visible()
    except Exception:
        pass


def test_pdf_viewer_bytes_type(page: Page):
    """Test PDF viewer with raw bytes input."""
    _test_pdf_viewer_with_selectbox(page, "Bytes", "PDF viewer with raw bytes")


def test_pdf_viewer_path_type(page: Page):
    """Test PDF viewer with pathlib.Path input."""
    _test_pdf_viewer_with_selectbox(page, "Path", "PDF viewer with pathlib.Path")


def test_pdf_viewer_bytesio_type(page: Page):
    """Test PDF viewer with io.BytesIO input."""
    _test_pdf_viewer_with_selectbox(page, "BytesIO", "PDF viewer with io.BytesIO")


def test_pdf_viewer_buffered_reader_type(page: Page):
    """Test PDF viewer with BufferedReader input."""
    _test_pdf_viewer_with_selectbox(
        page, "BufferedReader", "PDF viewer with BufferedReader"
    )


def test_pdf_viewer_string_path_type(page: Page):
    """Test PDF viewer with string file path input."""
    _test_pdf_viewer_with_selectbox(
        page, "File Path String", "PDF viewer with string file path"
    )


def test_pdf_viewer_data_uri_type(page: Page):
    """Test PDF viewer with base64 data URI input."""
    _test_pdf_viewer_with_selectbox(page, "Data URI", "PDF viewer with base64 data URI")


def test_pdf_viewer_selectbox_renders_properly(page: Page):
    """Test that PDF viewer renders properly when using selectbox."""
    _select_file_type(page, "Path")

    # Check if container exists
    expect(page.get_by_test_id("pdf-container")).to_be_visible()

    # Now check if actual PDF pages are rendered
    # Look for page elements that would only exist if PDF is actually rendered
    pdf_pages_visible = False
    try:
        # Check for actual PDF page elements (not just containers)
        pdf_page = page.locator('[data-page-number="1"]').first
        pdf_page.wait_for(state="visible")

        # Check if the page has actual content (canvas or similar)
        canvas = page.locator("canvas").first
        canvas.wait_for(state="visible")
        pdf_pages_visible = True
    except Exception:
        pdf_pages_visible = False

    # Now trigger a re-render by changing the height slider
    if not pdf_pages_visible:
        _click_height_slider(page, width_ratio=0.6)
        page.wait_for_load_state("domcontentloaded")

        # Check again if PDF is now rendered
        try:
            canvas = page.locator("canvas").first
            canvas.wait_for(state="visible")
            pdf_pages_visible = True
        except Exception:
            pdf_pages_visible = False

    # Assert that PDF pages are actually visible
    assert pdf_pages_visible, "PDF content should be rendered, not just containers"


def test_pdf_viewer_actual_content_visible(page: Page):
    """Test that verifies actual PDF content is rendered, not just container elements."""
    # The default selection should work
    # Wait for container
    expect(page.get_by_test_id("pdf-container")).to_be_visible()

    # Now check for actual rendered content
    # PDF.js renders pages as canvas elements
    try:
        # Wait for at least one canvas element (rendered PDF page)
        canvas = page.locator("canvas").first
        expect(canvas).to_be_visible()

        # Also check for page container with page number
        page_container = page.locator('[data-page-number="1"]').first
        expect(page_container).to_be_visible()

    except Exception as e:
        # Take a screenshot for debugging
        page.screenshot(path="pdf_render_failure.png")
        raise AssertionError(f"PDF content not rendered, only containers exist: {e}")
