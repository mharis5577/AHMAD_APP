/**
 * Global In-App Dialog Manager
 * Replaces browser's ugly window.alert() and window.confirm() with luxury themed app modals.
 */

let dialogHandler = null;

export function registerDialogHandler(handler) {
  dialogHandler = handler;
  return () => {
    if (dialogHandler === handler) {
      dialogHandler = null;
    }
  };
}

/**
 * Show a themed in-app Alert dialog
 */
export function showAppAlert({
  title = 'Notice',
  message = '',
  type = 'warning', // 'warning', 'error', 'success', 'info'
  buttonText = 'Got It'
}) {
  return new Promise((resolve) => {
    if (dialogHandler) {
      dialogHandler({
        isOpen: true,
        title,
        message,
        type,
        buttonText,
        isConfirm: false,
        onConfirm: () => resolve(true),
        onClose: () => resolve(false)
      });
    } else {
      alert(`${title}\n\n${message}`);
      resolve(true);
    }
  });
}

/**
 * Show a themed in-app Confirmation dialog
 */
export function showAppConfirm({
  title = 'Please Confirm',
  message = '',
  type = 'question', // 'question', 'warning', 'danger'
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'primary', // 'primary' (gold) or 'danger' (red)
  onConfirm = null
}) {
  return new Promise((resolve) => {
    if (dialogHandler) {
      dialogHandler({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        confirmStyle,
        isConfirm: true,
        onConfirm: () => {
          onConfirm?.();
          resolve(true);
        },
        onClose: () => resolve(false)
      });
    } else {
      const res = confirm(`${title}\n\n${message}`);
      if (res) onConfirm?.();
      resolve(res);
    }
  });
}
