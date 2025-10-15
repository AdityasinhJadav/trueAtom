export const loader = async ({ request }) => {
  const url = new URL(request.url)
  const productId = url.searchParams.get('product_id') || ''

  const script = `
// Price Testing Script
(function() {
  'use strict';
  
  try { console.debug('[TrueAtoms] Script init'); } catch {}
  
  // Try to use product id from query, else auto-detect on product pages
  var PRODUCT_ID = '${productId}';
  if (!PRODUCT_ID) {
    try {
      if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product && window.ShopifyAnalytics.meta.product.id) {
        PRODUCT_ID = String(window.ShopifyAnalytics.meta.product.id);
      }
    } catch {}
  }
  // Use App Proxy base path (Shopify will forward to app /app/proxy/*)
  var PROXY_URL = '/apps/proxy';
  
  // Get current product variant ID
  function getCurrentVariantId() {
    const variantSelect = document.querySelector('[name="id"]');
    return variantSelect ? variantSelect.value : null;
  }
  
  // Get current price element
  function getPriceElement() {
    return document.querySelector('.price, .product-price, [class*="price"]') || 
           document.querySelector('[data-price]') ||
           document.querySelector('.money');
  }
  
  // Update price display
  function updatePrice(newPrice) {
    const priceElement = getPriceElement();
    if (!priceElement || !newPrice) return;
    
    // Format price
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(newPrice / 100);
    
    try {
      const before = String(priceElement.textContent || '').trim();
      const changed = before !== formattedPrice;
      console.debug('[TrueAtoms] Price update', { before, after: formattedPrice, changed });
    } catch {}

    // Update price text
    priceElement.textContent = formattedPrice;
    
    // Update any data attributes
    priceElement.setAttribute('data-price', newPrice);
    
    // Trigger price change event
    window.dispatchEvent(new CustomEvent('priceTestUpdate', {
      detail: { newPrice, formattedPrice }
    }));
  }
  
  // Check for active price test
  async function checkPriceTest() {
    try {
      const variantId = getCurrentVariantId();
      if (!PRODUCT_ID || !variantId) return;
      
      const response = await fetch(\`${PROXY_URL}?product_id=\${PRODUCT_ID}&variant_id=\${variantId}\`);
      const data = await response.json();
      
      if (data.ok && data.hasTest && data.price) {
        try { console.debug('[TrueAtoms] Assigned', { testId: data.testId, variation: data.variation, price: data.price }); } catch {}
        updatePrice(data.price);
        
        // Track page view
        try { console.debug('[TrueAtoms] page_view event'); } catch {}
        trackEvent('page_view', data.testId, data.variation);

        // Persist assignment for later submissions
        try { window.priceTestData = { testId: data.testId, variation: data.variation }; } catch {}

        // Ensure product form carries line item properties so the orders webhook can attribute purchase
        try {
          const form = document.querySelector('form[action*="cart"], form[action*="/cart/add"], form[action*="/cart"]');
          if (form && !form.querySelector('input[name="properties[pt_testId]"]')) {
            const i1 = document.createElement('input');
            i1.type = 'hidden';
            i1.name = 'properties[pt_testId]';
            i1.value = String(data.testId || '');
            form.appendChild(i1);

            const i2 = document.createElement('input');
            i2.type = 'hidden';
            i2.name = 'properties[pt_variation]';
            i2.value = String(data.variation || '');
            form.appendChild(i2);

            // Also carry visitor id for unique buyer counts without PII
            const i3 = document.createElement('input');
            i3.type = 'hidden';
            i3.name = 'properties[pt_vid]';
            try { i3.value = String(getVisitorId() || ''); } catch { i3.value = ''; }
            form.appendChild(i3);
          } else if (form) {
            const i1 = form.querySelector('input[name="properties[pt_testId]"]');
            const i2 = form.querySelector('input[name="properties[pt_variation]"]');
            const i3 = form.querySelector('input[name="properties[pt_vid]"]');
            if (i1) i1.value = String(data.testId || '');
            if (i2) i2.value = String(data.variation || '');
            if (i3) { try { i3.value = String(getVisitorId() || ''); } catch {} }
          }
        } catch {}
      } else if (data.ok && !data.hasTest) {
        try { console.debug('[TrueAtoms] No active test for this product'); } catch {}
      }
    } catch (error) {
      try { console.error('[TrueAtoms] Price test check failed', error); } catch {}
    }
  }
  
  // Enhanced visitor tracking
  function getVisitorId() {
    let visitorId = localStorage.getItem('pt_visitor_id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('pt_visitor_id', visitorId);
    }
    return visitorId;
  }

  // Enhanced session tracking
  function getSessionId() {
    let sessionId = sessionStorage.getItem('pt_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('pt_session_id', sessionId);
    }
    return sessionId;
  }

  // Track events with enhanced data
  function trackEvent(type, testId, variation, extra) {
    try {
      const eventData = {
        type,
        payload: {
          testId,
          variation,
          productId: PRODUCT_ID,
          variantId: getCurrentVariantId(),
          path: window.location.pathname,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          screenResolution: screen.width + 'x' + screen.height,
          viewportSize: window.innerWidth + 'x' + window.innerHeight,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          ts: new Date().toISOString(),
          ...(extra || {})
        }
      };

      // Send with retry logic
      try { console.debug('[TrueAtoms] send event', type); } catch {}
      fetch(\`${PROXY_URL}/events\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }).catch(error => {
        try { console.error('[TrueAtoms] Event tracking failed', error); } catch {}
        // Store failed events for retry
        const failedEvents = JSON.parse(localStorage.getItem('pt_failed_events') || '[]');
        failedEvents.push(eventData);
        localStorage.setItem('pt_failed_events', JSON.stringify(failedEvents.slice(-10))); // Keep last 10
      });
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  // Retry failed events
  function retryFailedEvents() {
    const failedEvents = JSON.parse(localStorage.getItem('pt_failed_events') || '[]');
    if (failedEvents.length === 0) return;

    failedEvents.forEach(eventData => {
      fetch(\`${PROXY_URL}/events\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }).then(() => {
        // Remove successful retry
        const updated = failedEvents.filter(e => e !== eventData);
        localStorage.setItem('pt_failed_events', JSON.stringify(updated));
      }).catch(() => {
        // Keep failed events for next retry
      });
    });
  }
  
  // Track add to cart
  function trackAddToCart(testId, variation) {
    trackEvent('add_to_cart', testId, variation, { qty: 1 });
  }
  
  // Track purchase (called from checkout)
  function trackPurchase(testId, variation, revenue) {
    trackEvent('purchase', testId, variation, { revenueCents: revenue });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkPriceTest();
      retryFailedEvents();
    });
  } else {
    checkPriceTest();
    retryFailedEvents();
  }

  // Retry failed events periodically
  setInterval(retryFailedEvents, 30000); // Every 30 seconds
  
  // Listen for variant changes
  document.addEventListener('change', function(e) {
    if (e.target.name === 'id' || e.target.closest('[name="id"]')) {
      setTimeout(checkPriceTest, 100);
    }
  });
  
  // Listen for add to cart
  document.addEventListener('submit', function(e) {
    const form = e.target.closest('form[action*="cart"]');
    if (form) {
      // Get test data from page
      const testData = window.priceTestData;
      if (testData) {
        trackAddToCart(testData.testId, testData.variation);
      }
    }
  });
  
  // Expose functions globally for checkout integration
  window.priceTest = {
    trackPurchase,
    checkPriceTest
  };
  
})();
`;

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  })
}

