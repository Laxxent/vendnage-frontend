const LoadingSpinner = () => {
  return (
    <div 
      id="loading-overlay"
      style={{ 
        position: 'fixed', 
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff', 
        zIndex: 999999,
        margin: '0px',
        padding: '0px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div 
        id="loading-content"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '16px',
          margin: '0px',
          padding: '0px',
          width: 'auto',
          height: 'auto'
        }}
      >
        <div 
          id="loading-spinner"
          style={{ 
            width: '48px', 
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #1053D5',
            borderRadius: '50%',
            margin: '0px',
            padding: '0px',
            flexShrink: 0
          }}
        ></div>
        <p style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#6B7280',
          textAlign: 'center',
          margin: '0px',
          padding: '0px',
          whiteSpace: 'nowrap'
        }}>
          Loading...
        </p>
      </div>
      <style>{`
        @keyframes loading-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        #loading-spinner {
          animation: loading-spin 1s linear infinite !important;
        }
        #loading-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 999999 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #loading-content {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;

