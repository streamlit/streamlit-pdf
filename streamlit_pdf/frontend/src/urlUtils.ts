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

declare global {
  interface Window {
    __streamlit?: {
      DOWNLOAD_ASSETS_BASE_URL?: string
    }
  }
}

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

  if (window.parent && window.parent.__streamlit?.DOWNLOAD_ASSETS_BASE_URL) {
    return window.parent.__streamlit.DOWNLOAD_ASSETS_BASE_URL
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
 * Why this is important:
 * - Streamlit serves media from an app-level endpoint, not a page-level path.
 *   In multipage apps the `streamlitUrl` may include the active page slug
 *   (e.g., `/Some_Page`). Naively appending `/media/...` produces
 *   `/Some_Page/media/...`, which does not exist. We anchor media at the app
 *   base by trimming only the last segment when needed, so URLs remain valid
 *   regardless of the current page.
 * - The function is resilient to odd inputs (extra slashes) and does not alter
 *   absolute/external URLs.
 *
 * Behavior:
 * - If `fileUrl` is `undefined`, returns `undefined`.
 * - If `fileUrl` does not start with `/media/` (after collapsing any leading
 *   slashes), returns `fileUrl` unchanged.
 * - If no `streamlitUrl` query parameter is present, returns `fileUrl`
 *   unchanged.
 * - When merging, the function:
 *   - Parses the `streamlitUrl`.
 *   - Derives an app base path from its pathname:
 *     - If the pathname ends with `/`, use it as-is.
 *     - Otherwise, drop the last path segment (e.g., a multipage slug) and keep
 *       the prefix.
 *   - Normalizes the base path by collapsing duplicate slashes and ensuring a
 *     single leading slash and a trailing slash (except when the base is just `/`).
 *   - Joins `${origin}${basePath}` with the normalized media path to form the
 *     absolute media URL.
 * - Inputs like `///media/file.pdf` are normalized and treated as media paths.
 *
 * Examples:
 * - `?streamlitUrl=http://localhost:8501` + `/media/file.pdf` →
 *   `http://localhost:8501/media/file.pdf`.
 * - `?streamlitUrl=http://localhost:8501/Some_Page` + `/media/file.pdf` →
 *   `http://localhost:8501/media/file.pdf` (drops the page segment).
 * - `mergeFileUrlWithStreamlitUrl("https://cdn.example.com/file.pdf")` → unchanged.
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

  try {
    const url = new URL(streamlitUrl)

    // Derive the app base solely from the Streamlit URL's pathname.
    // - If pathname ends with '/', it's already the base.
    // - Otherwise, drop the last segment (page slug) and keep the prefix.
    const parentPath = url.pathname || "/"
    let appBasePath: string
    if (parentPath.endsWith("/")) {
      appBasePath = parentPath
    } else {
      const lastSlash = parentPath.lastIndexOf("/")
      appBasePath = parentPath.slice(0, Math.max(0, lastSlash + 1))
      if (!appBasePath) {
        appBasePath = "/"
      }
    }

    // Normalize base path: collapse multiple slashes, ensure single leading and
    // trailing slash (except root which is just "/").
    appBasePath = appBasePath.replace(/\/{2,}/g, "/")
    if (!appBasePath.startsWith("/")) {
      appBasePath = `/${appBasePath}`
    }
    if (appBasePath !== "/" && !appBasePath.endsWith("/")) {
      appBasePath = `${appBasePath}/`
    }

    const origin = url.origin
    const mediaPath = normalizedFileUrl.replace(/^\/+/, "")
    const baseWithTrailingSlash = appBasePath

    return `${origin}${baseWithTrailingSlash}${mediaPath}`
  } catch {
    // Fallback: Simple replacement
    const base = streamlitUrl.replace(/\/+$/, "")
    const path = normalizedFileUrl.replace(/^\/+/, "")
    return `${base}/${path}`
  }
}
