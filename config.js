// Rutas locales: añadir únicamente los recursos auténticos de la pareja.
export const wedding = {
  assets: { video: 'assets/apertura.mp4', monogram: 'assets/monograma-transparente.png', couple: 'assets/claudia-jorge.png', chapel: 'assets/capilla.png', cats: null },
  // URL de ubicación exacta, verificada por la pareja. null oculta el botón.
  mapsUrl: null,
  accessDetails: null,
  giftText: null,
  // [{ name: 'Nombre del color', hex: '#123456' }]. Vacío hasta confirmar.
  guestPalette: [],
  // Cambiar a 'live' solo después de implementar el contrato del README.
  rsvp: { mode: 'demo', endpoint: '/api/invitation', demo: { name: 'Familia de ejemplo', seats: 2 } }
};
