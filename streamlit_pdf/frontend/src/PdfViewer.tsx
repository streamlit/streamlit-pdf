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

import { useVirtualizer } from "@tanstack/react-virtual"
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { flushSync } from "react-dom"
import { Document, Page, pdfjs } from "react-pdf"
import styles from "./PdfViewer.module.css"
import { mergeFileUrlWithStreamlitUrl } from "./urlUtils"

export type PdfViewerProps = {
  file?: string
  height?: number
}

// Configure PDF.js worker to use local file
// In Streamlit components, files are served from the same origin
pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}workers/pdf.worker.min.mjs`

// Zoom control constants
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.25
const INACTIVITY_TIMEOUT_MS = 5000 // Hide zoom controls after 5 seconds of inactivity

/**
 * Default estimated page height in pixels for virtualization.
 * This value is adjusted based on actual rendered pages.
 */
const DEFAULT_PAGE_HEIGHT = 800

/** Margin between pages in pixels */
const PAGE_MARGIN = 12

/**
 * A simple Streamlit component for viewing PDF files with virtualization
 *
 * @param {PdfViewerProps} props - Component props
 * @returns {ReactElement} The rendered PDF viewer component
 */
function PDFViewer({
  file: fileUrl,
  height = 600,
}: PdfViewerProps): ReactElement {
  const file = mergeFileUrlWithStreamlitUrl(fileUrl)

  const [numPages, setNumPages] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<{ main: string; help: string } | null>(
    null
  )
  const [zoom, setZoom] = useState<number>(1.0)
  const [showZoomControls, setShowZoomControls] = useState<boolean>(false)
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({})
  const [pageWidths, setPageWidths] = useState<Record<number, number>>({})
  const [containerWidth, setContainerWidth] = useState<number>(0)

  const contentRef = useRef<HTMLDivElement>(null)
  const documentContainerRef = useRef<HTMLDivElement>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isHoveringRef = useRef<boolean>(false)

  // Memoize PDF.js options to prevent unnecessary re-renders
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: `${import.meta.env.BASE_URL}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
    }),
    []
  )

  const calcPageHeight = useMemo(() => {
    //Calculate the page height as an average of the current existing page heights stored in pageHeights
    const pageHeightValues = Object.values(pageHeights)
    if (pageHeightValues.length === 0) {
      return DEFAULT_PAGE_HEIGHT
    }
    const totalHeight = pageHeightValues.reduce(
      (acc, height) => acc + height,
      0
    )
    return Math.round(totalHeight / pageHeightValues.length)
  }, [pageHeights])

  // Virtualizer setup
  const getScrollElement = useCallback(() => contentRef.current, [])

  const measureElement = useCallback(
    (element: Element) => {
      // Read the data-index attribute of the element
      const index = element.getAttribute("data-index")
      const isLoaded = index ? !!pageHeights[parseInt(index, 10)] : false

      if (element && isLoaded) {
        return element.getBoundingClientRect().height + PAGE_MARGIN // Include margin
      }
      return calcPageHeight * zoom + PAGE_MARGIN
    },
    [pageHeights, zoom, calcPageHeight]
  )

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement,
    estimateSize: useCallback(
      (index: number) => {
        const pageIndex = index
        // Use actual measured height if available, otherwise estimate
        const baseHeight = pageHeights[pageIndex] || calcPageHeight
        // Apply scale to the height

        return baseHeight * zoom + PAGE_MARGIN // Add margin
      },
      [pageHeights, zoom, calcPageHeight]
    ),
    overscan: 3, // Render 3 pages above and below viewport
    measureElement,
  })

  // Function to update container width
  const updateContainerWidth = useCallback(() => {
    if (contentRef.current) {
      setContainerWidth(contentRef.current.clientWidth)
    }
  }, [])

  // Set up resize observer for window resizes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateContainerWidth)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateContainerWidth])

  // Handle scroll events to hide zoom controls
  useEffect(() => {
    const handleScroll = () => {
      setShowZoomControls(false)

      // Clear any existing timeouts
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }
    }

    const scrollElement = contentRef.current
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll, { passive: true })
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  // Handle mouse movement for inactivity timeout
  useEffect(() => {
    const resetInactivityTimer = () => {
      // Clear existing timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
      }

      // Set new timeout for inactivity
      inactivityTimeoutRef.current = setTimeout(() => {
        setShowZoomControls(false)
      }, INACTIVITY_TIMEOUT_MS)
    }

    const handleMouseMove = () => {
      if (showZoomControls) {
        resetInactivityTimer()
      }
    }

    const container = containerRef.current
    if (container && showZoomControls) {
      container.addEventListener("mousemove", handleMouseMove)
      resetInactivityTimer() // Start timer when controls are shown
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove)
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
      }
    }
  }, [showZoomControls])

  /**
   * Called when PDF document loads successfully
   */
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }): void => {
      setNumPages(numPages)
      setLoading(false)
      setError(null)
    },
    []
  )

  /**
   * Called when PDF document fails to load
   */
  const onDocumentLoadError = useCallback((error: Error): void => {
    setLoading(false)

    // Parse error message to provide more helpful feedback
    let errorMessage = error.message.toLowerCase()
    let userFriendlyMessage = ""
    let helpText = ""

    if (
      errorMessage.includes("cors") ||
      errorMessage.includes("cross-origin")
    ) {
      userFriendlyMessage = "Unable to load PDF from external source"
      helpText =
        "The PDF is hosted on a different domain that doesn't allow cross-origin requests. Try downloading the PDF and uploading it directly, or ask the website owner to enable CORS."
    } else if (
      errorMessage.includes("invalid pdf") ||
      errorMessage.includes("pdf header") ||
      errorMessage.includes("not a pdf")
    ) {
      userFriendlyMessage = "Invalid PDF file"
      helpText =
        "The file doesn't appear to be a valid PDF. Please check that the file is not corrupted and is actually a PDF document."
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("load")
    ) {
      userFriendlyMessage = "Network error loading PDF"
      helpText =
        "Unable to download the PDF. This could be due to network issues or CORS restrictions. Please check your internet connection."
    } else if (
      errorMessage.includes("not found") ||
      errorMessage.includes("404")
    ) {
      userFriendlyMessage = "PDF not found"
      helpText =
        "The PDF file could not be found at the specified location. Please check the URL or file path."
    } else if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      userFriendlyMessage = "Access denied"
      helpText = "You don't have permission to access this PDF."
    } else {
      userFriendlyMessage = "Unable to load PDF"
      helpText = `Error details: ${error.message}`
    }

    setError({ main: userFriendlyMessage, help: helpText })
  }, [])

  /**
   * Callback when a page loads successfully - capture its dimensions
   */
  const onPageLoadSuccess = useCallback(
    (pageIndex: number, page: any) => {
      setPageHeights(prev => ({
        ...prev,
        [pageIndex]: page.height,
      }))

      setPageWidths(prev => ({
        ...prev,
        [pageIndex]: page.width,
      }))

      // Tell virtualizer to remeasure this item
      virtualizer.measureElement(virtualizer.scrollElement)
    },
    [virtualizer]
  )

  /**
   * Zoom control functions
   */
  const zoomIn = useCallback(() => {
    flushSync(() => {
      setZoom(prevZoom => Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP))
    })
    virtualizer.measure()
  }, [virtualizer])

  const zoomOut = useCallback(() => {
    flushSync(() => {
      setZoom(prevZoom => Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP))
    })
    virtualizer.measure()
  }, [virtualizer])

  const canZoomIn = zoom < MAX_ZOOM
  const canZoomOut = zoom > MIN_ZOOM

  if (!file) {
    return (
      <div
        className={styles.noFileContainer}
        data-testid="pdf-no-file-container"
      >
        <div>
          <div className={styles.noFileIcon}>📄</div>
          <h3 className={styles.noFileTitle}>No PDF file provided</h3>
          <p className={styles.noFileText}>
            Please provide a PDF file to display
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      data-testid="pdf-container"
      style={
        {
          "--default-page-height": `${calcPageHeight}px`,
        } as React.CSSProperties
      }
      onMouseEnter={() => {
        isHoveringRef.current = true
        setShowZoomControls(true)
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false
        setShowZoomControls(false)
        // Clear timeouts when leaving
        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current)
          inactivityTimeoutRef.current = null
        }
      }}
    >
      {/* Zoom Controls */}
      {!loading && !error && file && (
        <div
          className={`${styles.zoomControls} ${showZoomControls ? styles.visible : ""}`}
        >
          <button
            className={`${styles.zoomButton} ${!canZoomIn ? styles.disabled : ""}`}
            onClick={zoomIn}
            disabled={!canZoomIn}
            title="Zoom In"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 29 29"
              fill="currentColor"
            >
              <path d="M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5z" />
            </svg>
          </button>
          <button
            className={`${styles.zoomButton} ${!canZoomOut ? styles.disabled : ""}`}
            onClick={zoomOut}
            disabled={!canZoomOut}
            title="Zoom Out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 29 29"
              fill="currentColor"
            >
              <path d="M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-9z" />
            </svg>
          </button>
        </div>
      )}

      {/* PDF Content Area */}
      <div
        ref={contentRef}
        className={styles.content}
        style={{ height: `${height}px` }}
        data-testid="pdf-content"
      >
        {loading && (
          <div className={styles.loadingContainer} data-testid="pdf-loading">
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorContainer} data-testid="pdf-error">
            <div>
              <div className={styles.errorIcon}>⚠️</div>
              <h3 className={styles.errorTitle}>
                {error.main || "Failed to load PDF"}
              </h3>
              <p className={styles.errorText}>{error.help}</p>
            </div>
          </div>
        )}

        {!error && (
          <div
            ref={documentContainerRef}
            className={styles.documentContainer}
            data-testid="pdf-document-container"
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
              options={pdfOptions}
            >
              {numPages > 0 && (
                <div
                  className={styles.virtualContainer}
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                  }}
                >
                  {virtualizer.getVirtualItems().map(virtualItem => {
                    const pageIndex = virtualItem.index
                    const pageNumber = pageIndex + 1 // Only for react-pdf (1-based)
                    const pageWidth = pageWidths[pageIndex] || 612 * zoom
                    const leftOffset = Math.max(
                      16,
                      (containerWidth - pageWidth) / 2
                    )

                    return (
                      <div
                        key={virtualItem.key}
                        data-index={pageIndex}
                        ref={virtualizer.measureElement}
                        className={styles.virtualItem}
                        style={{
                          left: `${leftOffset}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                          width: `${pageWidth}px`,
                        }}
                      >
                        <div className={styles.pageContainer}>
                          <Page
                            pageNumber={pageNumber}
                            scale={zoom}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className={styles.pdfPage}
                            onLoadSuccess={page =>
                              onPageLoadSuccess(pageIndex, page)
                            }
                            loading={
                              <div className={styles.pagePlaceholder}>
                                <p>Loading page {pageNumber}...</p>
                              </div>
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
