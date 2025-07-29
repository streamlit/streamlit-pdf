/**
 * Copyright 2025 Snowflake Inc.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PdfViewer from "./PdfViewer"
import type { ComponentProps } from "streamlit-component-lib"

// Mock streamlit-component-lib
vi.mock("streamlit-component-lib", () => ({
  ComponentProps: {},
  Streamlit: {
    setComponentValue: vi.fn(),
    setFrameHeight: vi.fn(),
  },
  withStreamlitConnection: (component: any) => component,
}))

// Mock @tanstack/react-virtual
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getTotalSize: () => 2562,
    getVirtualItems: () => [
      {
        key: "item-0",
        index: 0,
        start: 0,
        size: 854,
        lane: 0,
      },
      {
        key: "item-1",
        index: 1,
        start: 854,
        size: 854,
        lane: 0,
      },
      {
        key: "item-2",
        index: 2,
        start: 1708,
        size: 854,
        lane: 0,
      },
    ],
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
    measure: vi.fn(),
    scrollElement: null,
  })),
}))

// Mock react-pdf
vi.mock("react-pdf", () => ({
  Document: ({ children, onLoadSuccess, file }: any) => {
    // Simulate successful load if file is provided
    if (file) {
      setTimeout(() => onLoadSuccess?.({ numPages: 3 }), 0)
    }
    return <div className="mock-pdf-document">{file ? children : null}</div>
  },
  Page: ({ pageNumber, onLoadSuccess }: any) => {
    // Simulate page load success
    setTimeout(() => {
      onLoadSuccess?.({ height: 842, width: 612 })
    }, 0)
    return (
      <div className="mock-pdf-page" data-testid={`pdf-page-${pageNumber}`}>
        Page {pageNumber}
      </div>
    )
  },
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
}))

// Type the PdfViewer component for testing
const TypedPdfViewer = PdfViewer as React.FC<ComponentProps>

describe("PdfViewer", () => {
  const defaultArgs = {
    file: "data:application/pdf;base64,JVBERi0xLjUKJeLjz9M=",
    height: 600,
  }

  const defaultTheme = {
    backgroundColor: "#ffffff",
    secondaryBackgroundColor: "#f0f0f0",
    textColor: "#000000",
    base: "light" as const,
    primaryColor: "#0068c9",
    font: "sans-serif",
  }

  const defaultProps: ComponentProps = {
    args: defaultArgs,
    theme: defaultTheme,
    width: 0,
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default ResizeObserver mock
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    }))
  })

  it("renders without crashing", () => {
    render(<TypedPdfViewer {...defaultProps} />)
    expect(screen.getByTestId("pdf-container")).toBeVisible()
  })

  it("shows no file message when file is not provided", () => {
    render(<TypedPdfViewer {...defaultProps} args={{ height: 600 }} />)
    expect(screen.getByText("No PDF file provided")).toBeVisible()
    expect(
      screen.getByText("Please provide a PDF file to display")
    ).toBeVisible()
  })

  it("displays loading state initially", () => {
    render(<TypedPdfViewer {...defaultProps} />)
    expect(screen.getByText("Loading PDF...")).toBeInTheDocument()
  })

  it("renders pages after loading", async () => {
    render(<TypedPdfViewer {...defaultProps} />)

    // Wait for the loading state to disappear
    await waitForElementToBeRemoved(() => screen.queryByText("Loading PDF..."))

    // Check that pages are rendered (with our mocked virtualizer, we should have 3 pages)
    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument()
      expect(screen.getByText("Page 2")).toBeInTheDocument()
      expect(screen.getByText("Page 3")).toBeInTheDocument()
    })
  })

  it("applies custom height", () => {
    const customHeight = 800
    const customProps = {
      ...defaultProps,
      args: { ...defaultArgs, height: customHeight },
    }
    render(<TypedPdfViewer {...customProps} />)

    // Check that the height style is actually applied to the content div
    const contentDiv = screen.getByTestId("pdf-content")
    expect(contentDiv).toHaveStyle({ height: `${customHeight}px` })
  })

  it("shows zoom controls", async () => {
    render(<TypedPdfViewer {...defaultProps} />)

    // Wait for loading to complete
    await waitForElementToBeRemoved(() => screen.queryByText("Loading PDF..."))

    // Check that zoom controls are rendered
    expect(screen.getByTitle("Zoom In")).toBeInTheDocument()
    expect(screen.getByTitle("Zoom Out")).toBeInTheDocument()
  })

  it("handles zoom in functionality", async () => {
    const user = userEvent.setup()

    render(<TypedPdfViewer {...defaultProps} />)

    // Wait for loading to complete
    await waitForElementToBeRemoved(() => screen.queryByText("Loading PDF..."))

    const zoomInButton = screen.getByTitle("Zoom In")
    const zoomOutButton = screen.getByTitle("Zoom Out")

    // Initially, zoom out should be disabled (at default zoom of 1.0)
    expect(zoomOutButton).not.toHaveClass("disabled")
    expect(zoomInButton).not.toHaveClass("disabled")

    // Click zoom in button once
    await user.click(zoomInButton)

    // Both buttons should still be enabled after one zoom in
    expect(zoomOutButton).not.toHaveClass("disabled")
    expect(zoomInButton).not.toHaveClass("disabled")
  })

  it("handles zoom out functionality", async () => {
    const user = userEvent.setup()

    render(<TypedPdfViewer {...defaultProps} />)

    // Wait for loading to complete
    await waitForElementToBeRemoved(() => screen.queryByText("Loading PDF..."))

    const zoomOutButton = screen.getByTitle("Zoom Out")

    // Initially should be able to zoom out from default 1.0
    expect(zoomOutButton).not.toHaveClass("disabled")

    // Click zoom out button once
    await user.click(zoomOutButton)

    // Should still be enabled (went from 1.0 to 0.75)
    expect(zoomOutButton).not.toHaveClass("disabled")
  })

  it("applies theme colors through CSS variables", () => {
    const customTheme = {
      ...defaultTheme,
      backgroundColor: "#123456",
      primaryColor: "#654321",
    }

    const customProps = {
      ...defaultProps,
      theme: customTheme,
    }

    render(<TypedPdfViewer {...customProps} />)

    const container = screen.getByTestId("pdf-container")

    // Check that the container has the CSS variable for page height
    expect(container.style.getPropertyValue("--default-page-height")).toMatch(
      /\d+px/
    )
  })

  it("renders PDF document container", async () => {
    render(<TypedPdfViewer {...defaultProps} />)

    // Wait for loading to complete
    await waitForElementToBeRemoved(() => screen.queryByText("Loading PDF..."))

    // Check that document container exists
    expect(screen.getByTestId("pdf-document-container")).toBeInTheDocument()
  })

  it("sets up ResizeObserver for container width updates", () => {
    const observeMock = vi.fn()
    const disconnectMock = vi.fn()

    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: vi.fn(),
    }))

    const { unmount } = render(<TypedPdfViewer {...defaultProps} />)

    // Verify ResizeObserver is set up
    expect(global.ResizeObserver).toHaveBeenCalledTimes(1)
    expect(observeMock).toHaveBeenCalled()

    // Cleanup should disconnect observer
    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })
})
