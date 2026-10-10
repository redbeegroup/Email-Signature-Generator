export const PORT = Number(process.env.PORT) || 8080;
export const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
export const ASSETS_BASE = `${PUBLIC_BASE_URL}/icons`;
