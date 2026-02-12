//==============================================================================

import type { PyodideAPI } from '@renderer/assets/pyodide'

//==============================================================================

const rdfTestPython = `
import oximock as rdf

node = rdf.namedNode('https://celldl.org/example#node')

print('Node type:', type(node))

s1 = rdf.literal('s1')
print('s1:', s1, type(s1))

s2 = rdf.literal('s2', node)
print('s2:', s2, type(s2))

s3 = rdf.literal('s3', datatype=node)
print('s3:', s3)

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

sparql = '''
select ?uri ?type where {
    ?uri a ?type
}
'''

#===============================================

store = rdf.RdfStore()
store.load('https://bg-rdf.org/store', ttl)

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

for row in store.query(sparql).to_py():
    print('  ', row)

`

//==============================================================================

export async function test(pyodide: PyodideAPI): Promise<any> {
    return pyodide.runPythonAsync(rdfTestPython)
}

//==============================================================================
//==============================================================================
