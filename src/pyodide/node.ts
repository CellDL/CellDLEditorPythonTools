/**
 * From https://github.com/subframe7536/fonttools/blob/main/packages/fonttools/index.js
 *
 * MIT License
 *
 * Copyright (c) 2023 subframe7536
 *
 */

import { loadPyodide, type PyodideAPI } from 'pyodide'

import type { LoadInNodeOption } from './types'
export type { LoadInNodeOption } from './types'

/**
 * Load `pyodide` in `node` using the loader wrapped for Vite
 */
export async function loadInNode(
  options: LoadInNodeOption = {},
): Promise<PyodideAPI> {
  return await loadPyodide(options)
}
