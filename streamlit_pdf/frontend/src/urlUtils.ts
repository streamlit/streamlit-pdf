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
 * For Custom Components v2, read the current URL and return the origin and
 * pathname.
 *
 * @returns The Streamlit URL or null if not found
 */
const getStreamlitUrl = () => {
  if (typeof window === "undefined") {
    return null
  }

  if (window?.__streamlit?.DOWNLOAD_ASSETS_BASE_URL) {
    return window.__streamlit.DOWNLOAD_ASSETS_BASE_URL
  }

  try {
    const currentUrl = new URL(window.location.href)
    return `${currentUrl.origin}${currentUrl.pathname}`
  } catch {
    return null
  }
}

/**
 * Merges a Streamlit-served media path with the Streamlit app base URL.
 *
 * Source of truth for the base URL:
 * - If available, uses `window.__streamlit.DOWNLOAD_ASSETS_BASE_URL` as the app
 *   base.
 * - Otherwise, derives the base from the current window location
 *   (`window.location`), using the origin plus an app-level base path derived
 *   from the pathname:
 *   - If the pathname ends with `/`, it is used as-is.
 *   - Otherwise, the last path segment (e.g., a multipage slug) is dropped and
 *     the prefix is kept.
 *
 * Normalization and behavior:
 * - If `fileUrl` is `undefined`, returns `undefined`.
 * - If `fileUrl` does not start with `/media/` (after collapsing leading
 *   slashes), returns `fileUrl` unchanged (absolute/external URLs are not
 *   modified).
 * - When merging, the base path is normalized by collapsing duplicate slashes,
 *   ensuring a single leading slash and a trailing slash (except when the base
 *   is just `/`). Inputs like `///media/file.pdf` are normalized and treated as
 *   media paths.
 * - The final URL is `${origin}${normalizedBasePath}${normalizedMediaPath}`.
 * - If the parent-provided base is malformed, a conservative fallback replaces
 *   trailing slashes in the base and prefixes the normalized media path.
 *
 * Examples:
 * - Current location `http://localhost:8501/` + `/media/file.pdf` →
 *   `http://localhost:8501/media/file.pdf`.
 * - Current location `http://localhost:8501/Some_Page` + `/media/file.pdf` →
 *   `http://localhost:8501/media/file.pdf` (drops the page segment).
 * - Parent base `https://foo.streamlit.app/bar/baz/_stcore/` + `/media/file.pdf` →
 *   `https://foo.streamlit.app/bar/baz/_stcore/media/file.pdf`.
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
