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

import { CSSProperties } from "react"

/** Map the data.height value to a CSS height value */
export const getHeight = (
  height: number | string | "stretch" | undefined
): CSSProperties["height"] => {
  // Special case for "stretch"
  if (height === "stretch") {
    return "100%"
  }

  // Set height to a pixel value if provided
  if (typeof height === "number" || typeof height === "string") {
    return `${height}px`
  }

  return undefined
}
