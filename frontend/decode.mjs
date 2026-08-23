import { readFileSync } from 'fs';
import { SourceMapConsumer } from 'source-map';

const mapPath = './dist/assets/index-DJpxZM7C.js.map';
const rawMap = JSON.parse(readFileSync(mapPath, 'utf8'));

// Coordenadas exactas del error de producción:
// "at jp (index-DJpxZM7C.js:55:27461)"
const line = 55;
const column = 27461;

SourceMapConsumer.with(rawMap, null, (consumer) => {
  const pos = consumer.originalPositionFor({ line, column });
  console.log('Posición original:', pos);
  // pos.source = archivo real, pos.line = línea real, pos.name = nombre real de la variable/función
});