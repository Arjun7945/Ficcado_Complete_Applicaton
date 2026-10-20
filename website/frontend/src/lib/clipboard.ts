// =============================================================================
// Resilient Clipboard Utility — /src/lib/clipboard.ts
// Handles modern Async Clipboard API with automatic fallback to execCommand
// Prevents NotAllowedError: Document is not focused on iOS, iframes, and background tabs.
// =============================================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof window === 'undefined') return false;

  // 1. Try modern navigator.clipboard if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Document is not focused, permission denied, or unsupported environment;
      // proceed gracefully to resilient DOM fallback below.
    }
  }

  // 2. Resilient fallback using temporary textarea + document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Prevent scrolling to bottom of page on iOS / mobile Safari
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);

      // On iOS devices, select() requires explicit setSelectionRange
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch {
      // Fallback failed
    }
  }

  return false;
}
