const BASE_URL = process.env.DIRECTUS_URL!.replace(/\/$/, '');
const TOKEN = process.env.DIRECTUS_TOKEN!;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export async function dGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function dPost(path: string, data: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function dPatch(path: string, data: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function dDelete(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
