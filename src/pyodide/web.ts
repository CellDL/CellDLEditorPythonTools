/**
 *
 * MIT License
 *
 * Copyright (c) 2023 subframe7536
 *
 */

import { loadPyodide, type PyodideAPI } from 'pyodide'

import type { LoadInBrowserOption } from './types'
export type { LoadInBrowserOption } from './types'

/**
 * Load `pyodide` in the browser using the loader wrapped for Vite
 */
export async function loadInBrowser(
  options: LoadInBrowserOption = {},
): Promise<PyodideAPI> {
  return await loadPyodide(options)
}
