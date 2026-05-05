export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    
    // Use Hugging Face free inference API
    const HF_API = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
    
    const response = await fetch(HF_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: prompt + '\n\nRespond in JSON format as requested.',
        parameters: { 
          max_new_tokens: 1500,
          temperature: 0.9,
          top_p: 0.95,
          return_full_text: false
        }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('HF API error:', data);
      return res.status(response.status).json({ error: data });
    }
    
    // Format response to match Gemini structure
    const text = data[0]?.generated_text || '';
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text }]
        }
      }]
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
