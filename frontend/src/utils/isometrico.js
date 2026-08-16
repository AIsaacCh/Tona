// utils/isometrico.js
// Proyecta un punto 3D (x, y, z) a coordenadas 2D de pantalla usando
// proyección isométrica real (ángulos de 30° — el estándar de la técnica).

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

export function proyectar(x, y, z) {
  // x → derecha-abajo, z → izquierda-abajo, y → arriba (eje vertical real)
  const sx = (x - z) * COS30;
  const sy = (x + z) * SIN30 - y;
  return { x: sx, y: sy };
}

export function puntosAPath(puntos3d, cerrar = false) {
  const pts2d = puntos3d.map(([x, y, z]) => proyectar(x, y, z));
  let d = pts2d.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`), "");
  if (cerrar) d += " Z";
  return d;
}