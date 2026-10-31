// ===== Site settings: edit these before launch =====
window.SITE_CONFIG = {
  // Brand name (approved Oct 30, 2026). If changed, also update <title> tags and manifest.webmanifest.
  siteName: 'Rumbletuck',

  // Waitlist backend. Leave endpoint empty to show the polite "coming soon" state.
  // provider 'rumbletuck' = our own double opt-in API (Cloudflare Worker + Resend, no third-party badge).
  waitlist: {
    provider: 'rumbletuck',
    endpoint: 'https://api.rumbletuck.com/subscribe'
  },

  fullLibraryCount: '80+'
};
