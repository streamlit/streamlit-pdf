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
import react from "@vitejs/plugin-react"
import { createRequire } from "node:module"
import path from "node:path"
import process from "node:process"
import { defineConfig, UserConfig } from "vite"
import { viteStaticCopy } from "vite-plugin-static-copy"

const require = createRequire(import.meta.url)

/**
 * Vite configuration for Streamlit React Component development
 *
 * @see https://vitejs.dev/config/ for complete Vite configuration options
 */
export default defineConfig(({ mode }) => {
  const isProd = process.env.NODE_ENV === "production"
  const isDev = !isProd

  // Get the path to pdfjs-dist
  const pdfjsDistPath = path.dirname(require.resolve("pdfjs-dist/package.json"))

  return {
    base: "./",
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: path.join(pdfjsDistPath, "build", "pdf.worker.min.mjs"),
            dest: "assets/workers",
          },
          {
            src: path.join(pdfjsDistPath, "cmaps/*"),
            dest: "assets/cmaps",
          },
          {
            src: path.join(pdfjsDistPath, "standard_fonts/*"),
            dest: "assets/standard_fonts",
          },
        ],
      }),
    ],
    define: {
      // We are building in library mode, we need to define the NODE_ENV
      // variable to prevent issues when executing the JS.
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      minify: isDev ? false : "esbuild",
      outDir: "build",
      sourcemap: isDev,
      assetsDir: "assets",
      copyPublicDir: true,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve(__dirname, "src/index.tsx"),
        formats: ["es"],
        fileName: () => "assets/index-[hash].js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "assets/index-[hash].js",
          chunkFileNames: "assets/chunk-[hash].js",
          assetFileNames: assetInfo => {
            const name = assetInfo.name || "asset"
            if (name.endsWith(".css")) {
              return "assets/index-[hash][extname]"
            }
            return "assets/[name]-[hash][extname]"
          },
        },
      },
    },
    publicDir: "public",
  } satisfies UserConfig
})
