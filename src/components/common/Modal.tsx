import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  width?: number | string;
  hideCloseButton?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  width = 520,
  hideCloseButton,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="modal__header">
            <h2 className="modal__title">{title}</h2>
            {!hideCloseButton && onClose && (
              <button
                type="button"
                className="modal__close"
                onClick={onClose}
                aria-label="Закрыть"
              >
                ✕
              </button>
            )}
          </header>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
