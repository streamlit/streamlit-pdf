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

import { beforeEach, describe, expect, it } from "vitest"

import { mergeFileUrlWithStreamlitUrl } from "./urlUtils"

const setSearch = (search: string) => {
  const url = search ? `?${search}` : "/"
  window.history.replaceState({}, "", url)
}

describe("mergeFileUrlWithStreamlitUrl", () => {
  beforeEach(() => {
    setSearch("")
  })

  describe("with streamlitUrl in query", () => {
    beforeEach(() => {
      setSearch("streamlitUrl=http://localhost:8501")
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

    it.each([
      "http://localhost:8501",
      "http://localhost:8501/",
      "http://localhost:8501///",
    ])("merges base variant %s with media path", base => {
      setSearch(`streamlitUrl=${base}`)
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

  describe("without streamlitUrl (no query)", () => {
    beforeEach(() => {
      setSearch("")
    })

    it("returns media URL as-is", () => {
      const fileUrl = "/media/file.pdf"
      expect(mergeFileUrlWithStreamlitUrl(fileUrl)).toBe(fileUrl)
    })
  })

  describe("without streamlitUrl (unrelated query)", () => {
    beforeEach(() => {
      setSearch("foo=bar&baz=1")
    })

    it("returns media URL as-is", () => {
      const fileUrl = "/media/file.pdf"
      expect(mergeFileUrlWithStreamlitUrl(fileUrl)).toBe(fileUrl)
    })
  })

  describe("with encoded streamlitUrl in query", () => {
    beforeEach(() => {
      const encoded = "streamlitUrl=http%3A%2F%2Flocalhost%3A8501%2F"
      setSearch(encoded)
    })

    it("decodes and merges correctly", () => {
      expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
        "http://localhost:8501/media/file.pdf"
      )
    })
  })
})
