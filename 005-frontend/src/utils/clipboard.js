/**
 * Copies the given text to the clipboard.
 * Falls back to using a temporary textarea element and document.execCommand('copy')
 * if navigator.clipboard is not available (e.g. in non-HTTPS environments or older webviews).
 * 
 * @param {string} text - The text to copy.
 * @returns {Promise<boolean>} Resolves to true if the copy succeeded, false otherwise.
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, trying fallback: ", err);
    }
  }

  // Fallback method
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Set position fixed and hide it to avoid scrolling/layout shift
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed: ", err);
    document.body.removeChild(textArea);
    return false;
  }
}
