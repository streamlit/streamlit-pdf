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
import { defineConfig, loadEnv, UserConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { viteStaticCopy } from "vite-plugin-static-copy"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)

/**
 * Vite configuration for Streamlit React Component development
 *
 * @see https://vitejs.dev/config/ for complete Vite configuration options
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const port = env.VITE_PORT ? parseInt(env.VITE_PORT) : 3001

  // Get the path to pdfjs-dist
  const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'))

  return {
    base: "./",
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: path.join(pdfjsDistPath, 'build', 'pdf.worker.min.mjs'),
            dest: 'workers'
          },
          {
            src: path.join(pdfjsDistPath, 'cmaps/*'),
            dest: 'cmaps'
          },
          {
            src: path.join(pdfjsDistPath, 'standard_fonts/*'),
            dest: 'standard_fonts'
          }
        ]
      })
    ],
    server: {
      port,
    },
    build: {
      outDir: "build",
      assetsDir: "assets",
      copyPublicDir: true,
    },
    publicDir: "public",
  } satisfies UserConfig
})
