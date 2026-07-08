function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function isMysqlStorage(): boolean {
  const config = useRuntimeConfig();
  return config.public.storageDriver === 'mysql';
}

export async function storageGet<T>(url: string, params?: Record<string, string>): Promise<T | null> {
  const query = new URLSearchParams(params);
  return $fetch<T | null>(`${url}?${query.toString()}`);
}

export async function storagePut<T>(url: string, body: unknown): Promise<T> {
  return $fetch<T>(url, {
    method: 'PUT',
    body,
  });
}

export async function storagePatch<T>(url: string, body: unknown): Promise<T> {
  return $fetch<T>(url, {
    method: 'PATCH',
    body,
  });
}

export async function storageDelete<T>(url: string, body: unknown): Promise<T> {
  return $fetch<T>(url, {
    method: 'DELETE',
    body,
  });
}

export { base64ToBlob, blobToBase64 };
