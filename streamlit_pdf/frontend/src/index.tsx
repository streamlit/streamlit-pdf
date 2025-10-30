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

import type {
  Component,
  ComponentArgs,
  ComponentState,
} from "@streamlit/component-v2-lib"
import { StrictMode } from "react"
import { createRoot, Root } from "react-dom/client"
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

// Handle the possibility of multiple instances of the component to keep track
// of the React roots for each component instance.
const reactRoots: WeakMap<ComponentArgs["parentElement"], Root> = new WeakMap()

const ComponentEntry: Component<ViewerState, ViewerData> = component => {
  const { data, parentElement } = component

  // Get the react-root div from the parentElement that we defined in our
  // `st.components.v2.component` call in Python.
  const rootElement = parentElement.querySelector(".react-root")

  if (!rootElement) {
    throw new Error("Unexpected: React root element not found")
  }

  // Check to see if we already have a React root for this component instance.
  let reactRoot = reactRoots.get(parentElement)
  if (!reactRoot) {
    // If we don't, create a new root for the React application using the React
    // DOM API.
    // @see https://react.dev/reference/react-dom/client/createRoot
    reactRoot = createRoot(rootElement)
    reactRoots.set(parentElement, reactRoot)
  }

  reactRoot.render(
    <StrictMode>
      <PDFViewer
        file={data?.file}
        height={typeof data?.height === "number" ? data.height : undefined}
      />
    </StrictMode>
  )

  // Return a function to cleanup the React application in the Streamlit
  // component lifecycle.
  return () => {
    const reactRoot = reactRoots.get(parentElement)

    if (reactRoot) {
      reactRoot.unmount()
      reactRoots.delete(parentElement)
    }
  }
}

export default ComponentEntry
