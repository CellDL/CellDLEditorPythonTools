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

import * as $rdf from '@editor/metadata'

//==============================================================================

const rdfModule = {
    blankNode: $rdf.blankNode,
    literal: $rdf.literal,
    namedNode: $rdf.namedNode,

    isBlankNode: $rdf.isBlankNode,
    isLiteral: $rdf.isLiteral,
    isNamedNode: $rdf.isNamedNode,

    RdfStore: function(documentUri: string): $rdf.RdfStore {
        return new $rdf.RdfStore(documentUri)
    }
}

//==============================================================================

const pythonPackages = [
    'bg2cellml-0.8.0-py3-none-any.whl',
    'flexcache-0.3-py3-none-any.whl',
    'flexparser-0.4-py3-none-any.whl',
    'lark-1.3.1-py3-none-any.whl',
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
    #pyodide: Object = globalThis.pyodide

    async #checkPyodide(): boolean {
        if (!this.#pyodide) {
            console.error("Pyodide hasn't loaded...")
            return false
        } else if (!packagesLoaded) {
            await this.#loadPackages()
            packagesLoaded = true
        }
        return true
    }

    async #loadPackages() {
        this.#pyodide.registerJsModule("rdf", rdfModule)
        for (const pkg of pythonPackages) {
            await pyodide.loadPackage(`/pyodide/wheels/${pkg}`)
        }
    }
}

//==============================================================================
//==============================================================================
