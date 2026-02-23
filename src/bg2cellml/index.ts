/******************************************************************************

CellDL Editor Tools

Copyright (c) 2022 - 2026 David Brooks

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

import type { PyodideAPI } from 'pyodide'

//==============================================================================

import { getBgRdf } from './celldl'

import { test as runTest } from './test'

export interface CellMLOutput {
    cellml?: string
    issues?: string[]
}

//==============================================================================
//==============================================================================

const SETUP_FRAMEWORK = `
import traceback
from bg2cellml.bondgraph.framework import BondgraphFramework, framework_from_rdf
from bg2cellml.rdf.types import Triple

def get_issues(issues, debug=False) -> list[str]:
    return [ traceback.format_exception(issue) if debug else issue.reason
        for issue in issues
    ]

framework: BondgraphFramework|None = None

def create_framework(statements: list[Triple]) -> list[str]:
    global framework
    framework = framework_from_rdf(statements)
    return get_issues(framework.issues)

create_framework
`

const BG2CELLML_VERSION = `
from bg2cellml import __version__

__version__
`

//==============================================================================

let pyodide: PyodideAPI|undefined
let pyodideRegistered: boolean = false

//==============================================================================
//==============================================================================

type Statement = object

// import from @celldl/editor-types
export type RdfInterface = {
    oximockRdfModule: object
    getRdfStatements: () => Statement[]
}

function status(msg: string, statusMsg: ((msg:string) => void)|undefined) {
    if (statusMsg) {
        statusMsg(msg)
    }
}

export async function initialisePython(pyodideApi: PyodideAPI, rdfInterface: RdfInterface,
                                       statusMsg: ((msg:string) => void)|undefined=undefined) {
    pyodide = pyodideApi
    if (!pyodideRegistered) {
        pyodide.registerJsModule("oximock", rdfInterface.oximockRdfModule)

        status('Loading Python packages', statusMsg)
        const pythonPackages = Object.keys(pyodideApi.lockfile.packages).sort()
        const nPkgs = pythonPackages.length
        let n = 1
        for (const pkg of pythonPackages) {
            status(`Loading package ${pkg} (${n}/${nPkgs})`, statusMsg)
            await pyodide.loadPackage(pkg, {
                messageCallback: ((_: string) => { })   // Suppress loading messages
            })
            n += 1
        }

        status('Loading RDF framework', statusMsg)
        const rdfStatements = rdfInterface.getRdfStatements()
        const createFramework = pyodide.runPython(SETUP_FRAMEWORK)
        const issues: string[] = createFramework(rdfStatements)
        if (issues.length) {
            window.alert(`Issues loading BG-RDF: ${issues}`)
        }

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
    if (pyodide) {
        const bg2cellml = pyodide.runPython(RUN_BG2CELLML)
        return bg2cellml(uri, bgRdf, debug)
    }
    return {
        issues: ['CellML conversion service has not been initialised']
    }
}

export function celldl2cellml(uri: string, celldl: string, debug: boolean=false): CellMLOutput {
    if (pyodide) {
        const bgRdf = getBgRdf(celldl)
        const bg2cellml = pyodide.runPython(RUN_BG2CELLML)
        return bg2cellml(uri, bgRdf, debug)
    }
    return {
        issues: ['CellML conversion service has not been initialised']
    }
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
    if (pyodide) {
        await runTest(pyodide)
    }
}

//==============================================================================
//==============================================================================
