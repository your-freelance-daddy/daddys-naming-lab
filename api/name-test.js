module.exports = async function handler(req, res) {
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
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1600,
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
        const dims = ['memorability', 'clarity', 'differentiation', 'tone_fit', 'longevity'];
        const lines = dims.map(dim => {
          const label = dim.replace('_', ' ').toUpperCase();
          const score = parsed.scores?.[dim];
          const diag = parsed.diagnosis?.[dim] || '';
          const fix = parsed.micro_fix?.[dim] || '';
          const fixLine = fix ? `\nMicro-fix: ${fix}` : '';
          return `${label}\nScore: ${score}/10\n${diag}${fixLine}`;
        });

        const total = parsed.total_score ?? dims.reduce((acc, d) => acc + (parsed.scores?.[d] || 0), 0);
        text = [
          ...lines,
          `TOTAL SCORE\n${total}/50`,
          `VERDICT\n${parsed.verdict || ''}`,
          `NAME DIRECTION\n${parsed.direction || ''}`,
          `CLOSING LINE\n${parsed.closing_line || ''}`
        ].join('\n\n');
      }
    } catch (e) {
      // text stays as-is if JSON parse fails
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
