/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2025 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import type * as vue from 'vue'

import { loadPyodide } from '@renderer/assets/pyodide/pyodide.mjs'
import type { PyodideAPI } from '@renderer/assets/pyodide/pyodide'
import type { PyProxy } from "@renderer/assets/pyodide/ffi.d.ts"

//==============================================================================

import * as $rdf from '@renderer/metadata/index'

import { getBgRdf } from './celldl'
import { test as runTest } from './test'

export interface CellMLOutput {
    cellml?: string
    issues?: string[]
}

//==============================================================================

// Load Pyodide's WASM module, our Python packages, and setup `bg2cellml`
// conversion

// This results in Vite bundling these files...
import pyodideAsmUrl from "@renderer/assets/pyodide/pyodide.asm.js?url"
import pyodideWasmUrl from "@renderer/assets/pyodide/pyodide.asm.wasm?url"
import stdlibUrl from "@renderer/assets/pyodide/python_stdlib.zip?url"
import lockUrl from "@renderer/assets/pyodide/pyodide-lock.json?url"

const parts = pyodideAsmUrl.split('/')
const pyodideBase = parts.slice(0, -1).join('/')

export async function initialisePython(status: (msg:string) => void) {
    status('Loading Python interpreter')
    loadPyodide({
        indexURL: pyodideBase
    }).then(async (pyodide: PyodideAPI) => {
        await initialisePyodide(pyodide, status)
        status('')
    })
}

//==============================================================================
//==============================================================================

const rdfModule = {
    blankNode: $rdf.blankNode,
    literal: (value: string, options={}) => {
        if ('datatype' in options) {
            return $rdf.literal(value, options.datatype)
        }
        return $rdf.literal(value)
    },
    namedNode: $rdf.namedNode,

    isBlankNode: $rdf.isBlankNode,
    isLiteral: $rdf.isLiteral,
    isNamedNode: $rdf.isNamedNode,

    RdfStore: (): $rdf.RdfStore => new $rdf.RdfStore()
}

//==============================================================================

const pythonWheelUrls = import.meta.glob('@renderer/assets/wheels/*.whl', {
    query: '?url',
    import: 'default',
    eager: true
})

// @ts-expect-error: `import:` above will return a string
const pythonPackages: string[] = [...Object.values(pythonWheelUrls)]

//==============================================================================

const SETUP_FRAMEWORK = `
import traceback
from bg2cellml.bondgraph.framework import get_framework

def get_issues(issues, debug=False) -> list[str]:
    return [ traceback.format_exception(issue) if debug else issue.reason
        for issue in issues
    ]

framework = await get_framework(base='${import.meta.env.BASE_URL}')
if framework.has_issues:
    print(''.join(get_issues(framework.issues)))
`

const BG2CELLML_VERSION = `
from bg2cellml import __version__

__version__
`

//==============================================================================

let pyodide: PyodideAPI|undefined
let pyodideRegistered: boolean = false

let bg2cellmlGlobals: PyProxy

async function initialisePyodide(pyodideApi: PyodideAPI, status: (msg:string) => void) {
    pyodide = pyodideApi
    if (!pyodideRegistered) {
        pyodide.registerJsModule("oximock", rdfModule)

        status('Loading Python packages')
        await pyodide.loadPackage(pythonPackages, {
            messageCallback: ((_: string) => { })       // Suppress loading messages
        })

        status('Loading RDF framework')
        bg2cellmlGlobals = pyodide.globals.get("dict")()
        await pyodide.runPythonAsync(SETUP_FRAMEWORK, { globals: bg2cellmlGlobals })

        const version = pyodide.runPython(BG2CELLML_VERSION)
        console.log(`Initialised BG-RDF framework using bg2cellml ${version} 😊`)
        pyodideRegistered = true
    }
}

//==============================================================================
//==============================================================================

const RUN_BG2CELLML = `
from pyodide.ffi import to_js

def bg2cellml(uri: str, bg_rdf: str, debug: bool=False):
    bgrdf_model = framework.make_bondgraph_model(uri, bg_rdf, debug=debug)
    if bgrdf_model.has_issues:
        result = { 'issues': get_issues(bgrdf_model.issues, debug) }
    else:
        cellml_model = bgrdf_model.make_cellml_model()
        result = { 'cellml': cellml_model.to_xml() }
    return to_js(result)

bg2cellml
`
//==============================================================================

function bg2cellml(uri: string, bgRdf: string, debug: boolean=false): CellMLOutput {
    const bg2cellml = pyodide.runPython(RUN_BG2CELLML, { globals: bg2cellmlGlobals })
    return bg2cellml(uri, bgRdf, debug)
}

export function celldl2cellml(uri: string, celldl: string, debug: boolean=false): CellMLOutput {
    const bgRdf = getBgRdf(celldl)
    const bg2cellml = pyodide.runPython(RUN_BG2CELLML, { globals: bg2cellmlGlobals })
    return bg2cellml(uri, bgRdf, debug)
}

export async function testBg2cellml(): Promise<CellMLOutput> {
    const model_uri = '/models/bvc.ttl'
    const full_uri = 'http://localhost/models/bvc.ttl'

    const response = await fetch(model_uri)
    if (response.ok) {
        const model_source = await response.text()

        const result = bg2cellml(full_uri, model_source, false)
        console.log(result)
        return result
    } else {
        return { 'issues': [`Cannot load ${model_uri}: ${response.statusText}`]}
    }
}

//==============================================================================
//==============================================================================

export async function rdfTest() {
    await runTest(pyodide)
}

//==============================================================================
//==============================================================================
