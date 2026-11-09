/* Privacy-minimized pageview analytics: no cookies, IP storage, fingerprint, session IDs or cross-site tracking. */
(() => {
  "use strict";
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  if (location.protocol !== "https:") return;
  const path = location.pathname;
  if (/^\/(privacy|terms|delete-account|delete-data)(\/|$)/i.test(path)) return;
  let referrer_host = "direct";
  try {
    if (document.referrer) referrer_host = new URL(document.referrer).hostname.toLowerCase().slice(0,120);
  } catch {}
  const params = new URLSearchParams(location.search);
  const payload = {
    path: path.slice(0,200),
    referrer_host,
    utm_source: (params.get("utm_source") || "").slice(0,80),
    utm_medium: (params.get("utm_medium") || "").slice(0,80),
  };
  const send = () => {
    fetch("https://mxdibxggmfdfdgcrzbqy.supabase.co/functions/v1/public-site-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", send, { once: true });
  else send();
})();
