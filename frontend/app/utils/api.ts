export const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    // If we're not running on the FastAPI default port 8000 (e.g. Next.js dev server on 3000),
    // redirect API requests to port 8000 of the current host.
    if (port && port !== "8000") {
      return `${protocol}//${hostname}:8000${path}`;
    }
  }
  // If we are served from port 8000 (production/exported frontend),
  // return the relative path to prevent CORS origin mismatch issues.
  return path;
};
