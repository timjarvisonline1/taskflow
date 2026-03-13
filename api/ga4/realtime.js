const { verifyUserToken, cors, getCredentials } = require('../_lib/supabase');
const { getGA4AccessToken, callGA4RealtimeApi } = require('../_lib/ga4-auth');
const { getCityCoords } = require('../_lib/city-coords');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const creds = await getCredentials(userId, 'google_analytics');
  if (!creds) return res.status(200).json({ error: 'Google Analytics not connected' });

  const saJson = creds.credentials && creds.credentials.service_account_json;
  const propertyId = creds.config && creds.config.property_id;

  if (!saJson || !propertyId) {
    return res.status(200).json({ error: 'Missing service account JSON or property ID' });
  }

  try {
    const token = await getGA4AccessToken(saJson);

    // Helper: call GA4 API with graceful error handling per call
    async function safeCall(dimensions, metrics) {
      try {
        return await callGA4RealtimeApi(token, propertyId, dimensions, metrics);
      } catch (e) {
        console.warn('GA4 call failed for dims [' + dimensions.join(',') + ']:', e.message);
        return { rows: null, _error: e.message };
      }
    }

    // Make 3 parallel API calls — each one can fail independently
    const [locResult, pageResult, sourceResult] = await Promise.all([
      // 1. Locations: country + city → activeUsers
      safeCall(['country', 'city'], ['activeUsers']),
      // 2. Pages: page path → activeUsers
      safeCall(['pagePath'], ['activeUsers']),
      // 3. Sources: source + medium → activeUsers
      safeCall(['sessionSource', 'sessionMedium'], ['activeUsers'])
    ]);

    // Parse locations and geocode
    const locations = [];
    let totalActive = 0;
    if (locResult.rows) {
      locResult.rows.forEach(function(row) {
        const country = row.dimensionValues[0].value;
        const city = row.dimensionValues[1].value;
        const users = parseInt(row.metricValues[0].value, 10) || 0;
        totalActive += users;

        // Skip "(not set)" cities
        if (city === '(not set)') {
          const coords = getCityCoords(null, country);
          if (coords) {
            locations.push({ country: country, city: null, lat: coords.lat, lng: coords.lng, users: users, exact: false });
          }
          return;
        }

        const coords = getCityCoords(city, country);
        if (coords) {
          locations.push({ country: country, city: city, lat: coords.lat, lng: coords.lng, users: users, exact: coords.exact });
        } else {
          // No coords found — still include with null coords for the data panels
          locations.push({ country: country, city: city, lat: null, lng: null, users: users, exact: false });
        }
      });
    }

    // If no location rows, get total from page or source data
    if (!locResult.rows || !locResult.rows.length) {
      if (pageResult.rows) {
        pageResult.rows.forEach(function(row) {
          totalActive += parseInt(row.metricValues[0].value, 10) || 0;
        });
      }
    }

    // Parse pages
    const pages = [];
    if (pageResult.rows) {
      pageResult.rows.forEach(function(row) {
        pages.push({
          page: row.dimensionValues[0].value,
          users: parseInt(row.metricValues[0].value, 10) || 0
        });
      });
      pages.sort(function(a, b) { return b.users - a.users; });
    }

    // Parse sources
    const sources = [];
    if (sourceResult.rows) {
      sourceResult.rows.forEach(function(row) {
        const source = row.dimensionValues[0].value;
        const medium = row.dimensionValues[1].value;
        const users = parseInt(row.metricValues[0].value, 10) || 0;
        sources.push({
          source: source === '(not set)' ? '(direct)' : source,
          medium: medium === '(not set)' ? '(none)' : medium,
          campaign: null,
          users: users
        });
      });
      sources.sort(function(a, b) { return b.users - a.users; });
    }

    // Collect any per-call errors for debugging
    const errors = [];
    if (locResult._error) errors.push('locations: ' + locResult._error);
    if (pageResult._error) errors.push('pages: ' + pageResult._error);
    if (sourceResult._error) errors.push('sources: ' + sourceResult._error);

    return res.status(200).json({
      success: true,
      totalActive: totalActive,
      locations: locations,
      pages: pages.slice(0, 20),
      sources: sources.slice(0, 20),
      timestamp: new Date().toISOString(),
      warnings: errors.length ? errors : undefined
    });

  } catch (e) {
    console.error('GA4 realtime error:', e);
    return res.status(200).json({ success: false, error: e.message });
  }
};
