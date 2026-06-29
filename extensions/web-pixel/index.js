export async function register({ analytics, browser, settings }) {
  const { tracking_url, session_ttl_minutes } = settings;
  const SESSION_TTL = (session_ttl_minutes || 30) * 60 * 1000;

  function generateSessionId() {
    const stored = browser.localStorage.getItem('lvm_session_id');
    const storedTs = browser.localStorage.getItem('lvm_session_ts');
    const now = Date.now();

    if (stored && storedTs && now - parseInt(storedTs, 10) < SESSION_TTL) {
      return stored;
    }

    const id = 'sess_' + now + '_' + Math.random().toString(36).slice(2, 11);
    browser.localStorage.setItem('lvm_session_id', id);
    browser.localStorage.setItem('lvm_session_ts', String(now));
    return id;
  }

  function sendEvent(pageUrl, referrer) {
    const sessionId = generateSessionId();
    const body = JSON.stringify({
      session_id: sessionId,
      page_url: pageUrl,
      referrer: referrer || '',
    });

    browser.fetch(tracking_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      browser.sendBeacon(tracking_url, body);
    });
  }

  analytics.subscribe('page_viewed', (event) => {
    const context = event.context || {};
    const page = context.page || {};
    const document = context.document || {};
    const location = document.location || {};
    const url = page.url || location.href || '';
    const ref = page.referrer || document.referrer || '';
    sendEvent(url, ref);
  });

  analytics.subscribe('product_viewed', (event) => {
    const context = event.context || {};
    const page = context.page || {};
    const document = context.document || {};
    const location = document.location || {};
    const url = page.url || location.href || '';
    const ref = page.referrer || document.referrer || '';
    sendEvent(url, ref);
  });
}
