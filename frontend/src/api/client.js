// src/api/client.js
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function getRecommend({ lat, lng, skin_type }) {
  const res = await fetch(`${API_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, skin_type }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}