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

import { type PyodideAPI } from '@pyodide/pyodide'

import * as $rdf from '@editor/metadata/index'

//==============================================================================

import { test as rdfTest } from './test'

//==============================================================================

const rdfModule = {
    blankNode: $rdf.blankNode,
    literal: function(value: any, options={}) {
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

    RdfStore: function(): $rdf.RdfStore {
        return new $rdf.RdfStore()
    }
}

//==============================================================================

const pythonPackages = [
    'bg2cellml-0.8.1-py3-none-any.whl',
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

let packagesLoaded = false

//==============================================================================

export class BG2CellML {
    #pyodide: PyodideAPI = globalThis.pyodide

    async bg2cellml() {
        this.#checkPyodide().then(async (loaded) => {
            if (loaded) {
                await this.#pyodide.runPythonAsync(`
                    import bg2cellml.version as version
                    print('bg2cellml version', version.__version__)
                `)
            }
        })
    }

    async rdfTest() {
        this.#checkPyodide().then(async (loaded) => {
            if (loaded) {
                await rdfTest(this.#pyodide)
            }
        })
    }

    async #checkPyodide(): Promise<boolean> {
        if (!this.#pyodide) {
            console.error("Pyodide did not load...")
            return false
        } else {
            await navigator.locks.request("load-packages", async (lock) => {
                if (!packagesLoaded) {
                    await this.#loadPackages()
                    packagesLoaded = true
                }
            })
            return true
        }
    }

    async #loadPackages() {
        this.#pyodide.registerJsModule("rdf", rdfModule)
        await this.#pyodide.loadPackage(pythonPackages.map(pkg => `/pyodide/wheels/${pkg}`))
    }
}

//==============================================================================
//==============================================================================
