/** A native copy fallback for browsers or embedded views without Clipboard API access. */
function copyWithSelection(source: string): boolean {
  const active = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];
  const input = document.createElement('textarea');
  input.value = source;
  input.readOnly = true;
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  Object.assign(input.style, { position: 'fixed', top: '0', left: '0', opacity: '0', fontSize: '16px' });
  const preserveSource = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    // Textarea selection normalizes CRLF; copy the canonical source instead.
    event.clipboardData.setData('text/plain', source);
  };
  document.body.append(input);
  document.addEventListener('copy', preserveSource);
  try {
    input.focus({ preventScroll: true });
    input.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.removeEventListener('copy', preserveSource);
    input.remove();
    if (active instanceof HTMLElement && active.isConnected) active.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}

export async function copyMarkdown(source: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(source);
      return true;
    }
  } catch {
    // Permission policies and mobile WebViews can reject even a direct user gesture.
  }
  return copyWithSelection(source);
}
