export function openConnectModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoverse:connect'))
  }
}

export function useConnectModal() {
  return { open: openConnectModal }
}

export function openImage(src, alt) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoverse:image', { detail: { src, alt } }))
  }
}
