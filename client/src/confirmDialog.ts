export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning' | 'success';
}

export const showConfirm = (options: string | ConfirmOptions): Promise<boolean> => {
  const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('show-confirm-dialog', {
        detail: {
          title: opts.title || 'Please Confirm',
          message: opts.message,
          confirmText: opts.confirmText || 'Confirm',
          cancelText: opts.cancelText || 'Cancel',
          type: opts.type || 'primary',
          onResolve: (result: boolean) => resolve(result),
        },
      })
    );
  });
};
