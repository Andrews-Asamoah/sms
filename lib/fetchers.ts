/**
 * Generic fetcher for SWR.
 * Throws an error on non-OK HTTP responses so SWR can populate `error` state.
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    const error = new Error(info?.error || "An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
};
