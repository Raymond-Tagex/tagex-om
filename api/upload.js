// Two-endpoint approach:
// POST /api/upload - stores file in memory, returns a temp token
// GET  /api/upload?token=xxx - serves the file (Airtable fetches from here)
// Then PATCH Airtable with the URL to this GET endpoint

export const config = { api: { bodyParser: false } };

// In-memory store for temp files (Vercel functions keep warm for ~few seconds)
const store = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: serve stored file for Airtable to fetch
  if (req.method === 'GET') {
    const { token } = req.query;
    const entry = store.get(token);
    if (!entry) return res.status(404).json({ error: 'Token expired or not found' });
    res.setHeader('Content-Type', entry.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${entry.filename}"`);
    return res.send(entry.buffer);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { baseId, tableId, recordId, fieldName } = req.query;
    const authHeader = req.headers['authorization'];
    if (!baseId || !tableId || !recordId || !fieldName || !authHeader) {
      return res.status(400).json({ error: 'Missing params' });
    }

    // Parse multipart body manually
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body        = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';
    const bMatch      = contentType.match(/boundary=([^\s;]+)/);
    if (!bMatch) return res.status(400).json({ error: 'No boundary' });

    const boundary = '--' + bMatch[1];
    const bodyStr  = body.toString('binary');
    const parts    = bodyStr.split(boundary);
    let fileBuffer = null, filename = 'upload', mimetype = 'application/octet-stream';

    for (const part of parts) {
      if (!part.includes('filename=')) continue;
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers   = part.substring(0, headerEnd);
      const rawData   = part.substring(headerEnd + 4);
      const fileData  = rawData.endsWith('\r\n') ? rawData.slice(0, -2) : rawData;
      const nMatch    = headers.match(/filename="([^"]+)"/i);
      const tMatch    = headers.match(/Content-Type:\s*(\S+)/i);
      if (nMatch) {
        filename   = nMatch[1];
        mimetype   = tMatch ? tMatch[1] : mimetype;
        fileBuffer = Buffer.from(fileData, 'binary');
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'File parse failed' });
    }


    // Store file with a token
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set(token, { buffer: fileBuffer, filename, mimetype });
    // Auto-expire after 30 seconds
    setTimeout(() => store.delete(token), 30000);

    // Build URL to this same function (GET endpoint)
    const host    = req.headers['host'];
    const fileUrl = `https://${host}/api/upload?token=${token}`;

    // PATCH Airtable with the URL
    const patchRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
      {
        method: 'PATCH',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { [fieldName]: [{ url: fileUrl, filename }] }
        })
      }
    );

    const responseText = await patchRes.text();

    let data = {};
    try { data = JSON.parse(responseText); } catch(e) { data = { raw: responseText }; }
    res.status(patchRes.status).json(data);

  } catch (e) {
    console.error('[PROXY] error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
