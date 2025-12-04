import QRScanner from './QRScanner';

function App() {
  const handleValidation = (result) => {
    console.log("Résultat émargement:", result);
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Application Émargement</h1>
      </header>
      
      <main style={styles.main}>
        <QRScanner onValidation={handleValidation} />
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#1f2937',
    padding: '16px',
    textAlign: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: '20px',
    margin: 0,
  },
  main: {
    padding: '20px',
  },
};

export default App;
