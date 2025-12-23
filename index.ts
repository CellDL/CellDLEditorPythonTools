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

import type { PyodideAPI } from '@pyodide/pyodide'
import type { PyProxy } from "@pyodide/ffi.d.ts"

//==============================================================================

import * as $rdf from '@editor/metadata/index'

import { getBgRdf } from './celldl'
import { test as runTest } from './test'

export interface CellMLOutput {
    cellml?: string
    issues?: string[]
}

//==============================================================================

const rdfModule = {
    blankNode: $rdf.blankNode,
    literal: (value: string, options={}) => {
        if ('datatype' in options) {
            // @ts-expect-error:
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

const pythonPackages = [
    'bg2cellml-0.8.3-py3-none-any.whl',
    'flexcache-0.3-py3-none-any.whl',
    'flexparser-0.4-py3-none-any.whl',
    'lark-1.3.1-py3-none-any.whl',
    'lxml-6.0.2-cp313-cp313-pyodide_2025_0_wasm32.whl',
    'mpmath-1.3.0-py3-none-any.whl',
    'networkx-3.5-py3-none-any.whl',
    'pint-0.25-py3-none-any.whl',
    'platformdirs-4.5.0-py3-none-any.whl',
    'sympy-1.14.0-py3-none-any.whl',
    'typing_extensions-4.15.0-py3-none-any.whl',
    'ucumvert-0.3.0-py3-none-any.whl',
]

//==============================================================================

const SETUP_FRAMEWORK = `
import traceback
from bg2cellml.bondgraph.framework import get_framework

def get_issues(issues, debug=False) -> list[str]:
    for issue in issues:
        if debug:
            return traceback.format_exception(issue)
        else:
            return traceback.format_exception_only(issue)

framework = await get_framework()
if framework.has_issues:
    print(''.join(get_issues(framework.issues)))
`

//==============================================================================

let pyodide: PyodideAPI
let bg2cellmlGlobals: PyProxy

export async function initialisePyodide(pyodideApi: PyodideAPI, loadingMessage: vue.ref<string>) {
    pyodide = pyodideApi
    if (globalThis.pyodideInitialised === undefined) {
        pyodide.registerJsModule("oximock", rdfModule)
        loadingMessage.value = 'Loading Python packages'
        await pyodide.loadPackage(pythonPackages.map(pkg => `/python/wheels/${pkg}`), {
            messageCallback: ((_: string) => { })       // Suppress loading messages
        })

        loadingMessage.value = 'Loading RDF framework'
        bg2cellmlGlobals = pyodide.globals.get("dict")()
        await pyodide.runPythonAsync(SETUP_FRAMEWORK, { globals: bg2cellmlGlobals })

        console.log('Initialised BG-RDF framework 😊...')
        globalThis.pyodideInitialised = true
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
