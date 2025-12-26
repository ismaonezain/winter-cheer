/**
 * ================================================================================
 * Pinata Media API Helpers
 * ------------------------------------------------------------------------------
 * All public helpers in this file hide the proxy mechanics, JWT handling, and
 * data normalization required to talk to Pinata's V3 upload service.
 *
 * NEVER rename/remove exported helpers or mutate the global constants below.
 * ================================================================================
 */

const PINATA_JWT = '';
const PINATA_GATEWAY_BASE = 'https://amber-neighbouring-crayfish-334.mypinata.cloud/ipfs';

export type PinataNetwork = 'public' | 'private';

export type PinataFileSource =
  | File
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | string;

export interface PinataMetadataAttribute {
  trait_type: string;
  value: string | number;
}

export interface PinataMetadataInput {
  name: string;
  description?: string;
  attributes?: PinataMetadataAttribute[];
  external_url?: string;
  properties?: Record<string, unknown>;
}

export interface PinataMetadataDocument extends PinataMetadataInput {
  image: string;
  image_gateway: string;
}

export interface PinataUploadInput {
  source: PinataFileSource;
  filename?: string;
  displayName?: string;
  network?: PinataNetwork;
  mimeType?: string;
}

export interface PinataUploadResponseData {
  id: string;
  cid: string;
  name?: string;
  size?: number;
  number_of_files?: number;
  created_at?: string;
  mime_type?: string;
  group_id?: string | null;
  is_duplicate?: boolean;
}

export interface PinataPin {
  id: string;
  cid: string;
  ipfsUri: string;
  gatewayUrl: string;
  name?: string;
  size?: number;
  numberOfFiles?: number;
  mimeType?: string;
  createdAt?: string;
  isDuplicate?: boolean;
}

export interface PinataUploadResult {
  pin: PinataPin;
  raw: PinataUploadResponseData;
}

export interface PinataMetadataUploadInput {
  metadata: PinataMetadataInput;
  filename?: string;
  network?: PinataNetwork;
}

export interface PinataMetadataUploadResult {
  document: PinataMetadataDocument;
  pin: PinataPin;
  raw: PinataUploadResponseData;
}

export interface PinataImageWithMetadataInput {
  image: PinataFileSource;
  filename?: string;
  mimeType?: string;
  metadata: PinataMetadataInput;
  network?: PinataNetwork;
}

export interface PinataImageWithMetadataResult {
  image: PinataUploadResult;
  metadata: PinataMetadataUploadResult;
}

export async function pinataUploadFile(input: PinataUploadInput): Promise<PinataUploadResult> {
  if (!input?.source) throw new Error('Pinata: source is required');
  const filename = input.filename || 'pinata-upload';
  const network = input.network ?? 'public';
  const normalized = await normalizeBinary(input.source, filename, input.mimeType);

  const form = new FormData();
  form.append('body[network]', network);
  form.append('body[file]', normalized.blob, normalized.filename);
  if (input.displayName) form.append('body[name]', input.displayName);

  const data = await proxyPinataUpload(form);
  return {
    raw: data,
    pin: mapToPin(data),
  };
}

export async function pinataUploadMetadataDocument(
  input: PinataMetadataUploadInput,
  imagePin?: PinataPin,
): Promise<PinataMetadataUploadResult> {
  if (!input?.metadata?.name) throw new Error('Pinata: metadata.name is required');
  const filename = input.filename || `${slugify(input.metadata.name)}.json`;
  const doc = buildMetadataDocument(input.metadata, imagePin);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const upload = await pinataUploadFile({
    source: blob,
    filename,
    displayName: doc.name,
    network: input.network ?? 'public',
    mimeType: 'application/json',
  });

  return {
    document: doc,
    pin: upload.pin,
    raw: upload.raw,
  };
}

export async function pinataUploadImageWithMetadata(
  input: PinataImageWithMetadataInput,
): Promise<PinataImageWithMetadataResult> {
  if (!input?.metadata?.name) throw new Error('Pinata: metadata.name is required');
  const imageResult = await pinataUploadFile({
    source: input.image,
    filename: input.filename,
    displayName: input.metadata.name,
    network: input.network ?? 'public',
    mimeType: input.mimeType,
  });
  const metadataResult = await pinataUploadMetadataDocument(
    { metadata: input.metadata, network: input.network },
    imageResult.pin,
  );
  return {
    image: imageResult,
    metadata: metadataResult,
  };
}

export function pinataGatewayUrl(cid: string): string {
  const base = PINATA_GATEWAY_BASE.replace(/\/$/, '');
  return `${base}/${cid}`;
}

async function proxyPinataUpload(form: FormData): Promise<PinataUploadResponseData> {
  form.append('protocol', 'https');
  form.append('origin', 'uploads.pinata.cloud');
  form.append('path', '/v3/files');
  form.append('method', 'POST');
  form.append('headers', JSON.stringify({
    Authorization: `Bearer ${PINATA_JWT}`,
  }));

  // Detect if we're in server-side (Node.js) or client-side (browser)
  const isServer = typeof window === 'undefined';
  const proxyUrl = isServer 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://table-only-559.app.ohara.ai'}/api/proxy`
    : '/api/proxy';

  const res = await fetch(proxyUrl, {
    method: 'POST',
    body: form,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error || 'Pinata upload failed';
    throw new Error(message);
  }
  if (!payload?.data?.cid) {
    throw new Error('Pinata upload failed: missing data.cid');
  }
  return payload.data as PinataUploadResponseData;
}

async function normalizeBinary(
  source: PinataFileSource,
  fallbackName: string,
  mimeType?: string,
): Promise<{ blob: Blob; filename: string }> {
  const fileCtorAvailable = typeof File !== 'undefined';
  const blobCtorAvailable = typeof Blob !== 'undefined';

  if (fileCtorAvailable && source instanceof File) {
    return {
      blob: source,
      filename: source.name || fallbackName,
    };
  }

  if (blobCtorAvailable && source instanceof Blob) {
    return {
      blob: source,
      filename: fallbackName,
    };
  }

  if (source instanceof ArrayBuffer) {
    const blob = new Blob([source], { type: mimeType || 'application/octet-stream' });
    return { blob, filename: fallbackName };
  }

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    const blob = new Blob([slice], { type: mimeType || 'application/octet-stream' });
    return { blob, filename: fallbackName };
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const blob = dataUrlToBlob(source);
      return { blob, filename: fallbackName };
    }
    if (isHttpUrl(source)) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Unable to fetch media from URL (${response.status})`);
      const blob = await response.blob();
      return {
        blob,
        filename: deriveFilenameFromUrl(source) || fallbackName,
      };
    }
    const blob = new Blob([source], { type: mimeType || 'text/plain' });
    return { blob, filename: fallbackName };
  }

  throw new Error('Unsupported Pinata file source');
}

function mapToPin(data: PinataUploadResponseData): PinataPin {
  const cid = data.cid;
  return {
    id: data.id,
    cid,
    ipfsUri: `ipfs://${cid}`,
    gatewayUrl: pinataGatewayUrl(cid),
    name: data.name,
    size: data.size,
    numberOfFiles: data.number_of_files,
    mimeType: data.mime_type,
    createdAt: data.created_at,
    isDuplicate: data.is_duplicate,
  };
}

function buildMetadataDocument(
  metadata: PinataMetadataInput,
  imagePin?: PinataPin,
): PinataMetadataDocument {
  const doc: PinataMetadataDocument = {
    name: metadata.name,
    description: metadata.description,
    image: imagePin?.ipfsUri || '',
    image_gateway: imagePin?.gatewayUrl || '',
  };

  if (metadata.attributes?.length) {
    doc.attributes = metadata.attributes;
  }
  if (metadata.external_url) {
    doc.external_url = metadata.external_url;
  }
  if (metadata.properties && Object.keys(metadata.properties).length > 0) {
    for (const [key, value] of Object.entries(metadata.properties)) {
      (doc as Record<string, unknown>)[key] = value;
    }
  }

  return doc;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  if (!base64) throw new Error('Invalid data URL');
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = decodeBase64(base64);
  return new Blob([binary], { type: mime });
}

function decodeBase64(base64: string): Uint8Array {
  const globalObj = globalThis as typeof globalThis & {
    Buffer?: typeof Buffer;
    atob?: (input: string) => string;
  };
  if (typeof globalObj.atob === 'function') {
    const binaryString = globalObj.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  if (globalObj.Buffer) {
    return Uint8Array.from(globalObj.Buffer.from(base64, 'base64'));
  }

  throw new Error('Base64 decoding is not supported in this environment');
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function deriveFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (!segments.length) return null;
    return segments[segments.length - 1];
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'metadata';
}
