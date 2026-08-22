import sharp from 'sharp';

export async function convertToWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).webp({ quality: 80 }).toBuffer();
}

export async function uploadToDirectus(buffer: Buffer, filename: string): Promise<string> {
  const BASE_URL = process.env.DIRECTUS_URL!.replace(/\/$/, '');
  const TOKEN = process.env.DIRECTUS_TOKEN!;

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/webp' });
  formData.append('file', blob, filename);

  const res = await fetch(`${BASE_URL}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Directus upload gagal: ${res.status}`);
  const data = await res.json() as any;
  return `${BASE_URL}/assets/${data.data.id}`;
}