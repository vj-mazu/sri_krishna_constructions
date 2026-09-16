export type ToastType = 'success' | 'error' | 'info';

export const showToast = (message: string, type: ToastType = 'success') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
