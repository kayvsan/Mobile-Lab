/**
 * Generates a RFC4122 v4 compliant UUID.
 * Falls back to Math.random() if cryptographically secure random number generators are not available.
 * 
 * @returns {string} The generated UUID.
 */
export function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto) {
    if (typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    if (typeof window.crypto.getRandomValues === 'function') {
      try {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
          (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
      } catch (err) {
        console.warn("crypto.getRandomValues failed, using Math.random fallback: ", err);
      }
    }
  }

  // Fallback to Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}
