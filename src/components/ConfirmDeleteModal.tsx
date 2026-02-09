import { createPortal } from "react-dom";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
}

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}: ConfirmDeleteModalProps) => {
  if (!isOpen) return null;

  const modalContent = (
    <div 
      id="Confirm-Delete-Modal" 
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#292D32B2] cursor-pointer"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 99999,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative flex flex-col w-[406px] shrink-0 rounded-3xl p-[18px] gap-5 bg-white"
        style={{
          zIndex: 100000,
          position: 'relative',
          margin: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="modal-header flex items-center justify-between">
          <p className="font-semibold text-xl">{title}</p>
          <button
            onClick={onClose}
            className="flex size-14 rounded-full items-center justify-center bg-monday-gray-background hover:bg-monday-gray transition-colors"
          >
            <img
              src="/assets/images/icons/close-circle-black.svg"
              className="size-6"
              alt="close"
            />
          </button>
        </div>

        <div className="modal-content flex flex-col gap-4">
          <p className="font-semibold text-base text-gray-900">{message}</p>
          {itemName && (
            <p className="font-semibold text-lg text-gray-900">
              "{itemName}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="btn btn-red font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary font-semibold"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level, escaping any parent stacking context
  return createPortal(modalContent, document.body);
};

export default ConfirmDeleteModal;
