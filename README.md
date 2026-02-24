# Python tooling for the CellDL Editor

This package allows [CellML](https://cellml.org) to be generated for [BG-RDF](https://bg-rdf.org/) bond-graph models created by the CellDL Editor. It does so by bundling the [bg2cellml](https://github.com/CellDL/BG-Tools) Python package with the [Pyodide](https://pyodide.org) distribution, allowing `bg2cellml` to be used in a Javascript envirinment.

It is intended to be used with the [@celldl/editor](https://www.npmjs.com/package/@celldl/editor) Vue 3 component and the [@celldl/editor-rdf](https://www.npmjs.com/package/@celldl/editor-rdf) BG-RDF framework.


## Installation

```
bun add @celldl/editor-python-tools
```

## Usage

- **vite.config.ts:**

The use of these tools in a Vite production environment requires a plugin for Pyodide:

```typescript
import * as vite from 'vite'

import { pyodidePlugin } from '@celldl/editor-python-tools/vite'

export default vite.defineConfig({
    plugins: [
        pyodidePlugin()
    ]
})
```

- **Application.vue**

Besides a loaded Pyodide environment, the package requres an initialised BG-RDF framework.

```vue
<script setup lang="ts">
import * as vue from 'vue'

// BG-RDF environment

import * as $rdf from '@celldl/editor-rdf'

// Python tools

import { initialisePython, type PyodideAPI } from '@celldl/editor-python-tools'
import { loadInBrowser } from '@celldl/editor-python-tools/web'

// Initialise BG-RDF and Python before importing the CellDLEditor Vue component

const CellDLEditor = vue.defineAsyncComponent(async () => {

    await $rdf.initialise()

    const rdfInterface: $rdf.RdfInterface = {
        getRdfStatements: $rdf.bgRdfStatements,
        oximockRdfModule: $rdf.oxiRdfModule
    }

    await loadInBrowser().then(async (pyodideApi: PyodideAPI) => {
        await initialisePython(pyodideApi, rdfInterface, (msg: string) => {
            console.log(msg)
        })
    })

    return import('@celldl/editor')
})


// CellML generation

import { celldl2cellml, type CellMLOutput } from '@celldl/editor-python-tools'

const celldl: string = '<svg><!-- Valid CellDL --></svg>'
const celldlUri: string = `https://celldl.org/cellml/${name}`   // Some URI to identify the source

const cellmlObject: CellMLOutput = celldl2cellml(celldlUri, celldl)

if (cellmlObject.cellml) {
    const cellml: string = cellmlObject.cellml

    console.log(cellml)    // The resulting CellML

} else if (cellmlObject.issues) {
    const issues: string[] = cellmlObject.issues

    console.log(issues)    // Issues from generating CellML

} else {
    window.alert('Unexpected exception generating CellML...')
}
</setup>
```
