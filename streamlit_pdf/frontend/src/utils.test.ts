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

import { describe, it, expect } from "vitest"
import { getHeight } from "./utils"

describe("utils", () => {
  describe("getHeight", () => {
    it.each([
      ["maps numeric heights to px", 480, "480px"],
      ["maps numeric string heights to px", "640", "640px"],
      ['maps "stretch" to 100%', "stretch", "100%"],
      ["returns undefined when height is missing", undefined, undefined],
    ])("%s", (_label, input, expected) => {
      expect(getHeight(input as any)).toBe(expected)
    })
  })
})
