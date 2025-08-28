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
  const url = search ? (search.startsWith("?") ? search : `?${search}`) : "/"
  window.history.replaceState({}, "", url)
}

describe("mergeFileUrlWithStreamlitUrl", () => {
  beforeEach(() => {
    setSearch("")
  })

  it("returns URL as-is when not under /media", () => {
    setSearch("streamlitUrl=http://localhost:8501")

    const urls = [
      "https://example.com/file.pdf",
      "http://example.com/file.pdf",
      "//cdn.example.com/file.pdf",
      "/static/file.pdf",
      "images/file.pdf",
      "media/file.pdf",
      "/media",
      "data:application/pdf;base64,AAA",
      "blob:https://example.com/123",
    ]

    for (const u of urls) {
      expect(mergeFileUrlWithStreamlitUrl(u)).toBe(u)
    }
  })

  it("returns URL as-is when no streamlitUrl present (no query)", () => {
    const fileUrl = "/media/file.pdf"
    expect(mergeFileUrlWithStreamlitUrl(fileUrl)).toBe(fileUrl)
  })

  it("returns URL as-is when query exists but streamlitUrl missing", () => {
    setSearch("foo=bar&baz=1")
    const fileUrl = "/media/file.pdf"
    expect(mergeFileUrlWithStreamlitUrl(fileUrl)).toBe(fileUrl)
  })

  it("merges base without trailing slash and media path", () => {
    setSearch("streamlitUrl=http://localhost:8501")
    expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
      "http://localhost:8501/media/file.pdf"
    )
  })

  it("normalizes trailing slash on base URL", () => {
    setSearch("streamlitUrl=http://localhost:8501/")
    expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
      "http://localhost:8501/media/file.pdf"
    )
  })

  it("normalizes multiple trailing slashes on base URL", () => {
    setSearch("streamlitUrl=http://localhost:8501///")
    expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
      "http://localhost:8501/media/file.pdf"
    )
  })

  it("normalizes multiple leading slashes on media path", () => {
    setSearch("streamlitUrl=http://localhost:8501")
    expect(mergeFileUrlWithStreamlitUrl("///media/file.pdf")).toBe(
      "http://localhost:8501/media/file.pdf"
    )
  })

  it("preserves nested media subpaths", () => {
    setSearch("streamlitUrl=http://localhost:8501")
    expect(mergeFileUrlWithStreamlitUrl("/media/sub/dir/file.pdf")).toBe(
      "http://localhost:8501/media/sub/dir/file.pdf"
    )
  })

  it("accepts encoded streamlitUrl parameter", () => {
    const encoded = "streamlitUrl=http%3A%2F%2Flocalhost%3A8501%2F"
    setSearch(encoded)
    expect(mergeFileUrlWithStreamlitUrl("/media/file.pdf")).toBe(
      "http://localhost:8501/media/file.pdf"
    )
  })
})
