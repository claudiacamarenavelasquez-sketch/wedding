// Rutas locales: añadir únicamente los recursos auténticos de la pareja.
export const wedding = {
  assets: { video: 'assets/apertura.mp4', monogram: 'assets/monograma-transparente.png', couple: 'assets/claudia-jorge.png', chapel: 'assets/capilla.png', cats: null },
  // URL de ubicación exacta, verificada por la pareja. null oculta el botón.
  mapsUrl: 'https://maps.app.goo.gl/8mHtKmxxQYuKBo6k8',
  accessDetails: null,
  giftText: null,
  // Paleta sugerida confirmada por referencia visual. [{ name: 'Nombre del color', hex: '#123456' }]. Editable.
  guestPalette: [
    { name: 'Salvia', hex: '#798169' },
    { name: 'Oliva', hex: '#535b32' },
    { name: 'Azul petróleo', hex: '#193e46' },
    { name: 'Rosa empolvado', hex: '#bf907d' },
    { name: 'Camel', hex: '#b2875c' },
    { name: 'Chocolate', hex: '#69472f' }
  ],
  // Cambiar a 'live' solo después de implementar el contrato del README.
  rsvp: { mode: 'demo', endpoint: '/api/invitation', demo: { name: 'Familia de ejemplo', seats: 2 } }
};
