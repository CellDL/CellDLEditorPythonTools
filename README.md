# CellML generation for the CellDL Editor

This package provides a Javascript function to convert [BG-RDF](https://bg-rdf.org/) bond-graph models, created by the CellDL Editor, into [CellML](https://cellml.org). It does so by bundling the [bg2cellml](https://github.com/CellDL/BG-Tools) Python package with [Pyodide](https://pyodide.org), allowing it to be used in a Javascript envirinment.

It is intended to be used in conjunction with the [@celldl/editor](https://www.npmjs.com/package/@celldl/editor) Vue 3 component.


## Installation

```
bun add @celldl/editor-tools
```

## Usage

- **vite.config.ts:**

The use of these tools in a Vite production environment requires a plugin to allow Pyodide to be loaded:

```typescript
import * as vite from 'vite'

import { pyodidePlugin } from '@celldl/editor-tools/vite'

export default vite.defineConfig({
    plugins: [
        pyodidePlugin()
    ]
})
```

- **Application.vue**

```vue
<script setup lang="ts">
import * as vue from 'vue'

// Editor interface

import CellDLEditor from '@celldl/editor'
import { rdfInterface } from '@celldl/editor'

// Initialisation

import { initialisePython } from '@celldl/editor-tools'
import { loadInBrowser } from '@celldl/editor-tools/web'
import type { PyodideAPI } from '@celldl/editor-tools'

vue.nextTick().then(async () => {
    await loadInBrowser().then(async (pyodideApi: PyodideAPI) => {
        await initialisePython(pyodideApi, rdfInterface, (msg: string) => {
            console.log(msg)
        })
    })
})

// CellML generation

import { celldl2cellml } from '@celldl/editor-tools'
export type { CellMLOutput } from '@celldl/editor-tools'

const celldl: string = '<svg><!-- Valid CellDL --></svg>'
const celldlUri: string = `https://celldl.org/cellml/${name}`   // Some URI to identify the source

const cellmlObject: CellMLOutput = celldl2cellml(`https://celldl.org/cellml/${fileHandle.name}`, celldl)

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
