import { useEffect } from 'react';

interface SuccessNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  itemName?: string;
}

const SuccessNotification = ({
  isOpen,
  onClose,
  title,
  message,
  itemName,
}: SuccessNotificationProps) => {
  // Auto-hide after 900ms
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 900);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pointer-events-none bg-transparent animate-[fadeIn_0.2s_ease-out]"
      style={{ zIndex: 99999 }}
    >
      <div className="pointer-events-auto transform transition-all duration-300 ease-out animate-[slideUp_0.3s_ease-out]">
        <div
          className="flex flex-col items-center bg-white relative border border-gray-200"
          style={{
            zIndex: 100000,
            width: '380px',
            padding: '16px 24px',
            marginTop: '20px',
            borderRadius: '10px',
            boxShadow: `
              0 20px 60px -12px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(0, 0, 0, 0.05),
              inset 0 1px 2px rgba(255, 255, 255, 0.9)
            `
          }}
        >
          {/* Success Icon - Green Checkmark */}
          <div
            className="flex items-center justify-center rounded-full border-[2px] border-white shadow-[0_4px_12px_rgba(34,197,94,0.4)] mb-3"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {/* White Checkmark SVG */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'block',
                flexShrink: 0
              }}
            >
              <path
                d="M5 13L9 17L19 7"
                stroke="rgb(255, 255, 255)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          {/* Text Content */}
          <div className="text-center mb-3" style={{ padding: '0 2px' }}>
            <h3 className="font-bold text-base text-gray-900 mb-1">{title}</h3>
            <p className="text-xs text-gray-600 leading-snug">{message}</p>
            {itemName && (
              <p className="text-xs text-gray-600 leading-snug mt-1">
                "{itemName}"
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-1.5 rounded-md bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-xs transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
            aria-label="Close"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessNotification;

