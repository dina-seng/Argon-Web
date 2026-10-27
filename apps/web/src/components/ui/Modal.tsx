import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Modal – accessible overlay dialog.
 * TODO: Implement focus trap, aria-modal, and keyboard (Escape) close.
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  // TODO: implement backdrop and animation
  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <div onClick={onClose} />
      <div>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
