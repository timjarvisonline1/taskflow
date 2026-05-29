const { verifyUserToken, cors } = require('../_lib/supabase');
const { syncReadai } = require('../_lib/sync-readai');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Stream newline-delimited JSON so the browser sees progress in real time
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function emit(obj) {
    res.write(JSON.stringify(obj) + '\n');
  }

  try {
    const stats = await syncReadai(userId, emit);
    emit({ type: 'done', success: true, ...stats });
    res.end();
  } catch (e) {
    emit({ type: 'done', success: false, error: e.message });
    res.end();
  }
};
