import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onValidation }) => {
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setScanResult(null);

    try {
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          console.log("QR Code détecté:", decodedText);
          await html5QrCodeRef.current.stop();
          setIsScanning(false);
          validateAttendance(decodedText);
        },
        () => {}
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error("Erreur caméra:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
  };

  const validateAttendance = async (qrCode) => {
    try {
      // TODO: Remplacez par votre API
      await new Promise(resolve => setTimeout(resolve, 500));
      const isValid = qrCode && qrCode.length > 0;

      setScanResult({
        code: qrCode,
        isValid: isValid,
        message: isValid ? "Émargement validé ✓" : "QR Code invalide"
      });

      if (onValidation) {
        onValidation({ qrCode, isValid });
      }

    } catch (err) {
      setScanResult({
        code: qrCode,
        isValid: false,
        message: "Erreur de connexion au serveur"
      });
    }
  };

  const resetScan = () => {
    setScanResult(null);
    startScanning();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Scanner QR - Émargement</h2>

      <div style={styles.scannerContainer}>
        <div id="qr-reader" style={styles.scanner}></div>
        
        {!isScanning && !scanResult && (
          <div style={styles.placeholder}>
            <p>📷 Cliquez sur Démarrer pour scanner</p>
          </div>
        )}
      </div>

      {!scanResult && (
        <div style={styles.controls}>
          {!isScanning ? (
            <button onClick={startScanning} style={styles.buttonStart}>
              🎯 Démarrer le scan
            </button>
          ) : (
            <button onClick={stopScanning} style={styles.buttonStop}>
              ⏹ Arrêter
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={styles.errorCard}>
          <p>❌ {error}</p>
        </div>
      )}

      {scanResult && (
        <div style={{
          ...styles.resultCard,
          borderColor: scanResult.isValid ? '#22c55e' : '#ef4444'
        }}>
          <div style={{
            ...styles.resultIcon,
            backgroundColor: scanResult.isValid ? '#22c55e' : '#ef4444'
          }}>
            {scanResult.isValid ? '✓' : '✗'}
          </div>
          
          <h3 style={{
            ...styles.resultMessage,
            color: scanResult.isValid ? '#22c55e' : '#ef4444'
          }}>
            {scanResult.message}
          </h3>
          
          <p style={styles.resultCode}>
            Code: {scanResult.code.length > 30 ? scanResult.code.substring(0, 30) + '...' : scanResult.code}
          </p>
          
          <button onClick={resetScan} style={styles.buttonRetry}>
            🔄 Scanner un autre code
          </button>
        </div>
      )}

      {isScanning && (
        <p style={styles.instructions}>
          Placez le QR code dans le cadre
        </p>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#1f2937',
  },
  scannerContainer: {
    width: '100%',
    maxWidth: '400px',
    aspectRatio: '1',
    backgroundColor: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
  },
  scanner: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '16px',
  },
  controls: {
    marginTop: '20px',
  },
  buttonStart: {
    padding: '14px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  buttonStop: {
    padding: '14px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  buttonRetry: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '16px',
  },
  errorCard: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    color: '#dc2626',
  },
  resultCard: {
    marginTop: '20px',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '3px solid',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '350px',
  },
  resultIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '32px',
    color: '#fff',
  },
  resultMessage: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  resultCode: {
    fontSize: '14px',
    color: '#6b7280',
    wordBreak: 'break-all',
  },
  instructions: {
    marginTop: '16px',
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default QRScanner;
