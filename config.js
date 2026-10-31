// ===== Site settings: edit these before launch =====
window.SITE_CONFIG = {
  // Brand name (approved Oct 30, 2026). If changed, also update <title> tags and manifest.webmanifest.
  siteName: 'Rumbletuck',

  // Waitlist backend. Leave endpoint empty to show the polite "coming soon" state.
  // provider: 'formspree' | 'buttondown' | 'kit' | 'mailerlite' | 'google-form' | 'netlify' | 'generic'
  //   formspree   -> endpoint 'https://formspree.io/f/XXXXXXXX'
  //   buttondown  -> endpoint 'https://buttondown.com/api/emails/embed-subscribe/YOUR_USERNAME'
  //   kit         -> endpoint 'https://app.kit.com/forms/FORM_ID/subscriptions'
  //   google-form -> endpoint 'https://docs.google.com/forms/d/e/FORM_ID/formResponse' and set emailField: 'entry.123456789'
  //   netlify     -> endpoint '/' (only works when hosted on Netlify; the form has data-netlify markup)
  //   generic     -> any endpoint that accepts a POST with an "email" field
  waitlist: {
    provider: 'kit',   // approved provider; endpoint stays empty until the Kit form exists
    endpoint: '',
    emailField: ''   // optional override of the email field name (required for google-form)
  },

  fullLibraryCount: '80+'
};
