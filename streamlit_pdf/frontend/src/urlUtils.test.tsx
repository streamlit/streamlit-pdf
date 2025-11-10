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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mergeFileUrlWithStreamlitUrl } from "./urlUtils"

const setSearch = (search: string) => {
  const url = search ? `?${search}` : "/"
  window.history.replaceState({}, "", url)
}

const setWindowLocation = (url: string) => {
  const u = new URL(url)
  const loc: Partial<Location> = {
    href: u.href,
    origin: u.origin,
    protocol: u.protocol,
    host: u.host,
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    toString: () => u.href,
  }
  Object.defineProperty(window, "location", { value: loc, writable: true })
}

describe("mergeFileUrlWithStreamlitUrl", () => {
  beforeEach(() => {
    setSearch("")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("with current location at root", () => {
    beforeEach(() => {
      setWindowLocation("http://localhost:8501/")
    })

    it.each([
      "https://example.com/file.pdf",
      "http://example.com/file.pdf",
      "//cdn.example.com/file.pdf",
      "/static/file.pdf",
      "images/file.pdf",
      "media/file.pdf",
      "/media",
      "data:application/pdf;base64,AAA",
      "blob:https://example.com/123",
    ])("returns non-media URL as-is: %s", url => {
      expect(mergeFileUrlWithStreamlitUrl(url)).toBe(url)
    })

    it("merges root base with media path", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "http://localhost:8501/media/file.pdf"
      )
    })

    it("normalizes multiple leading slashes on media path", () => {
      expect(mergeFileUrlWithStreamlitUrl("///media/file.pdf")).toBe(
        "http://localhost:8501/media/file.pdf"
      )
    })

    it("preserves nested media subpaths", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/sub/dir/file.pdf")).toBe(
        "http://localhost:8501/media/sub/dir/file.pdf"
      )
    })
  })

  describe("with unrelated query (still uses current location base)", () => {
    beforeEach(() => {
      setWindowLocation("http://localhost:8501/?foo=bar&baz=1")
    })

    it("returns media URL as-is", () => {
      const fileUrl = "/media/file.pdf"
      expect(mergeFileUrlWithStreamlitUrl(fileUrl)).toBe(
        "http://localhost:8501/media/file.pdf"
      )
    })
  })

  describe("Multipage apps locally", () => {
    beforeEach(() => {
      setWindowLocation("http://localhost:8501/PDF_Viewer")
    })

    it("drops page slug and merges correctly", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "http://localhost:8501/media/file.pdf"
      )
    })
  })

  describe("Base path with Community Cloud prefix", () => {
    beforeEach(() => {
      setWindowLocation("https://st-pdf.streamlit.app/~/+/")
    })

    it("anchors media at the app base path", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "https://st-pdf.streamlit.app/~/+/media/file.pdf"
      )
    })
  })

  describe("Multipage apps in Community Cloud", () => {
    beforeEach(() => {
      setWindowLocation("https://st-pdf.streamlit.app/~/+/Upload_PDF")
    })

    it("decodes and merges correctly", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "https://st-pdf.streamlit.app/~/+/media/file.pdf"
      )
    })
  })

  describe("with parent window __streamlit.DOWNLOAD_ASSETS_BASE_URL", () => {
    afterEach(() => {
      // Clean up the injected parent variable to avoid cross-test pollution
      delete (window.parent as any).__streamlit
    })

    it("handles an overridden parent base URL", () => {
      ;(window.parent as any).__streamlit = {
        DOWNLOAD_ASSETS_BASE_URL: "https://foo.streamlit.app/bar/baz/_stcore/",
      }

      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "https://foo.streamlit.app/bar/baz/_stcore/media/file.pdf"
      )
    })
  })
})
