export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment variables' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.95,
            topP: 0.97,
            topK: 40,
            maxOutputTokens: 1400,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || 'Gemini request failed';
      return res.status(response.status).json({ error: message });
    }

    let text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.verdict) {
        text = [
          `MEMORABILITY\nScore: ${parsed.scores?.memorability ?? 7}/10\n${parsed.diagnosis?.memorability || ''}`,
          `CLARITY\nScore: ${parsed.scores?.clarity ?? 7}/10\n${parsed.diagnosis?.clarity || ''}`,
          `DIFFERENTIATION\nScore: ${parsed.scores?.differentiation ?? 7}/10\n${parsed.diagnosis?.differentiation || ''}`,
          `TONE FIT\nScore: ${parsed.scores?.tone_fit ?? 7}/10\n${parsed.diagnosis?.tone_fit || ''}`,
          `LONGEVITY\nScore: ${parsed.scores?.longevity ?? 7}/10\n${parsed.diagnosis?.longevity || ''}`,
          `TOTAL SCORE\n${parsed.total_score ?? 35}/50`,
          `VERDICT\n${parsed.verdict || ''}`,
          `NAME DIRECTION\n${parsed.direction || ''}`,
          `CLOSING LINE\n${parsed.closing_line || ''}`
        ].join('\n\n');
      }
    } catch (e) {}

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
