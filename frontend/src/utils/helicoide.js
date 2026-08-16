// utils/helicoide.js
// Genera puntos de una hélice real en 3D (no un zigzag 2D disfrazado).
// radio: qué tan "gordo" se ve el resorte, vueltas: número de espiras,
// altura: longitud total, segmentosPorVuelta: qué tan suave se ve la curva.

export function generarHelicoide({ radio = 22, vueltas = 7, altura = 260, segmentosPorVuelta = 20 }) {
  const totalSegmentos = vueltas * segmentosPorVuelta;
  const puntos = [];
  for (let i = 0; i <= totalSegmentos; i++) {
    const t = i / segmentosPorVuelta;          // vueltas acumuladas
    const angulo = t * Math.PI * 2;
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;
    const y = (i / totalSegmentos) * altura;
    puntos.push([x, y, z]);
  }
  return puntos;
}