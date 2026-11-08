export function descargarArchivo(nombre: string, contenido: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function imprimirHtml(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const ventana = window.open(url, '_blank');
  if (ventana) ventana.onload = () => { ventana.print(); URL.revokeObjectURL(url); };
}

export function imprimirTabla(titulo: string, filas: string[][]): void {
  const cuerpo = filas.map((fila) => (fila.length === 1 ? `<tr><th colspan="9">${escapeHtml(fila[0])}</th></tr>` : `<tr>${fila.map((celda) => `<td>${escapeHtml(celda)}</td>`).join('')}</tr>`)).join('');
  imprimirHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title><style>
body{font-family:Geist,system-ui,sans-serif;margin:40px;color:#0A0E0C}h1{font-size:20px}table{border-collapse:collapse;width:100%}
th{text-align:left;padding:16px 8px 6px;font-size:14px}td{padding:6px 8px;font-size:12px;border-bottom:1px solid #ECF0EE}
</style></head><body><h1>${escapeHtml(titulo)}</h1><table>${cuerpo}</table></body></html>`);
}
