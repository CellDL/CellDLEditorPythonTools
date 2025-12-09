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

import * as $rdf from '@editor/metadata'

//==============================================================================

const rdfTestPython = `
import rdf

node = rdf.namedNode('https://celldl.org/example#node')

print('node', node, rdf.isBlankNode(node), rdf.isLiteral(node), rdf.isNamedNode(node))
print()

#===============================================

ttl = '''@prefix : <#> .
@prefix bgf: <https://bg-rdf.org/ontologies/bondgraph-framework#> .
@prefix cdt: <https://w3id.org/cdt/> .
@prefix celldl: <http://celldl.org/ontologies/celldl#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix tpl: <https://bg-rdf.org/templates/> .

<> a celldl:Document, bgf:BondgraphModel ;
  <http://purl.org/dc/terms/created> "2025-11-20T00:14:00.859Z" ;
  <http://purl.org/dc/terms/modified> "2025-11-20T01:04:00.446Z" ;
  owl:versionInfo "1.0" ;
  bgf:usesTemplate tpl:electrical.ttl ;
  bgf:hasBondElement :ID-00000001, :ID-00000003, :ID-00000004 .

:ID-00000001 a celldl:Component, bgf:VoltageSource ;
  bgf:hasLocation "j" ;
  bgf:hasSpecies "i" ;
  bgf:hasSymbol "v_in" ;
  bgf:hasValue "10 V"^^cdt:ucum .
'''

#===============================================

store = rdf.RdfStore('https://bg-rdf.org/store')
store.load(ttl)

statements = store.statements()
print('Statements:')
for s in statements:
    print(f'[{s.subject.toString()}, {s.predicate.toString()}, {s.object.toString()}]')

print()
hasBondElement = rdf.namedNode('https://bg-rdf.org/ontologies/bondgraph-framework#hasBondElement')
bondElements = store.statementsMatching(None, hasBondElement, None)
print('Bond elements:')
for s in bondElements:
    print(f'[{s.subject.toString()}, {s.predicate.toString()}, {s.object.toString()}]')

`

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
                await this.#pyodide.runPythonAsync(rdfTestPython)
            }
        })
    }

    async #checkPyodide(): Promise<boolean> {
        if (!this.#pyodide) {
            console.error("Pyodide did not load...")
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
            await this.#pyodide.loadPackage(`/pyodide/wheels/${pkg}`)
        }
    }
}

//==============================================================================
//==============================================================================
