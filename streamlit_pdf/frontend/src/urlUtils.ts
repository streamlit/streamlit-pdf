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

/**
 * This should match the value of `MEDIA_ENDPOINT` in the Streamlit repo with an
 * added `/` at the end.
 * @see `lib/streamlit/web/server/server.py`
 */
const BASE_MEDIA_PATH = "/media/"

/**
 * For Custom Components v1, the Streamlit URL is passed as a query parameter in
 * the URL for the iframe.
 *
 * @returns The Streamlit URL or null if not found
 */
const getStreamlitUrl = () => {
  if (typeof window === "undefined") {
    return null
  }

  const search = window.location.search

  if (!search) {
    return null
  }

  const params = new URLSearchParams(search)
  const streamlitUrl = params.get("streamlitUrl")

  return streamlitUrl || null
}

/**
 * Merges a Streamlit-served media path with the Streamlit app base URL from the
 * current page's query string (the `streamlitUrl` parameter).
 *
 * Behavior:
 * - If `fileUrl` is `undefined`, returns `undefined`.
 * - If `fileUrl` does not start with `/media/` (after collapsing any leading
 *   slashes), returns `fileUrl` unchanged.
 * - If no `streamlitUrl` query parameter is present, returns `fileUrl`
 *   unchanged.
 * - When merging, trailing slashes are trimmed from the base URL and leading
 *   slashes from the media path to avoid duplicate slashes.
 * - Inputs like `///media/file.pdf` are normalized and treated as media paths.
 *
 * Example:
 * - Given `?streamlitUrl=http://localhost:8501`,
 *   `mergeFileUrlWithStreamlitUrl("/media/file.pdf")` →
 *   `http://localhost:8501/media/file.pdf`.
 * - `mergeFileUrlWithStreamlitUrl("https://example.com/file.pdf")` → unchanged.
 *
 * @param fileUrl The input file URL or path. May be absolute or a `/media/`-relative path.
 * @returns The merged absolute URL when applicable, otherwise the original `fileUrl` (or `undefined`).
 */
export const mergeFileUrlWithStreamlitUrl = (fileUrl: string | undefined) => {
  if (!fileUrl) {
    return undefined
  }

  // Normalize multiple leading slashes so inputs like "///media/..." are treated as media URLs
  const normalizedFileUrl = fileUrl.replace(/^\/+/, "/")

  if (!normalizedFileUrl.startsWith(BASE_MEDIA_PATH)) {
    // If the file URL is not a relative media URL, return it as is since it is
    // likely an external URL.
    return fileUrl
  }

  const streamlitUrl = getStreamlitUrl()

  if (!streamlitUrl) {
    return fileUrl
  }

  const base = streamlitUrl.replace(/\/+$/, "")
  const path = normalizedFileUrl.replace(/^\/+/, "")
  return `${base}/${path}`
}
