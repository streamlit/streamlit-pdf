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

import type { Component, ComponentState } from "@streamlit/component-v2-lib"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import PDFViewer from "./PdfViewer"
import "./index.css"

interface ViewerState extends ComponentState {
  numPages?: number
  zoom?: number
  error?: { main: string; help: string } | null
}

interface ViewerData {
  file?: string
  height?: number
}

const ComponentEntry: Component<ViewerState, ViewerData> = component => {
  const { data, parentElement } = component

  const root = createRoot(parentElement as Element)

  root.render(
    <StrictMode>
      <PDFViewer
        file={data?.file}
        height={typeof data?.height === "number" ? data.height : undefined}
      />
    </StrictMode>
  )

  return () => {
    root.unmount()
  }
}

export default ComponentEntry
