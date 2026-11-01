// Google Analytics 4. Does nothing unless VITE_GA_MEASUREMENT_ID is set (e.g. G-XXXXXXXXXX).
const ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Pages whose URL carries a secret (reset token, OAuth tokens) are reported by path only,
// and we never send query strings or hashes, so nothing sensitive leaves the browser.
export function initAnalytics() {
  if (!ID || window.gtag) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  // The app is a single-page app, so page views are sent by hand on each route change.
  window.gtag("config", ID, { send_page_view: false, anonymize_ip: true });
}

export function trackPage(path) {
  if (!ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
  });
}
