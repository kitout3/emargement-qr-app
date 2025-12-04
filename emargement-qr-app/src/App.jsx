import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Download, CheckCircle, XCircle, Users, FileSpreadsheet, X, Search, Calendar, ArrowLeft, Plus, UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';

const App = () => {
  const [view, setView] = useState('events');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mode, setMode] = useState('list');
  const [participants, setParticipants] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Charger les événements depuis localStorage au démarrage
  useEffect(() => {
    const savedEvents = localStorage.getItem('emargement-events');
    if (savedEvents) {
      try {
        setEvents(JSON.parse(savedEvents));
      } catch (e) {
        console.error('Erreur chargement événements:', e);
      }
    }
  }, []);

  // Sauvegarder les événements dans localStorage à chaque modification
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('emargement-events', JSON.stringify(events));
    }
  }, [events]);

  // Sons de validation et erreur
  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!newEventName.trim() || !newEventDate) {
      setMessage('❌ Veuillez renseigner le nom et la date de l\'événement');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = data[0];
        const idIndex = headers.findIndex(h => h && h.toLowerCase().includes('inscription'));
        const nameIndex = headers.findIndex(h => h && h.toLowerCase().includes('nom complet'));
        const emailIndex = headers.findIndex(h => h && h.toLowerCase().includes('email'));
        const guestIndex = headers.findIndex(h => h && h.toLowerCase().includes('invité'));
        const statusIndex = headers.findIndex(h => h && h.toLowerCase().includes('statut'));
        const managerIndex = headers.findIndex(h => h && h.toLowerCase().includes('gérant'));

        const importedParticipants = data.slice(1)
          .filter(row => row[idIndex])
          .map(row => ({
            id: String(row[idIndex] || '').trim(),
            name: String(row[nameIndex] || '').trim(),
            email: String(row[emailIndex] || '').trim(),
            guest: String(row[guestIndex] || '').trim(),
            status: String(row[statusIndex] || '').trim(),
            manager: String(row[managerIndex] || '').trim(),
            present: false,
            scannedAt: null
          }));

        const newEvent = {
          id: Date.now().toString(),
          name: newEventName,
          date: newEventDate,
          participants: importedParticipants,
          createdAt: new Date().toISOString()
        };

        setEvents(prev => [...prev, newEvent]);
        setMessage(`✅ Événement "${newEventName}" créé avec ${importedParticipants.length} participants`);
        setNewEventName('');
        setNewEventDate('');
        setView('events');
        
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('❌ Erreur lors de la lecture du fichier Excel');
        console.error(error);
      }
    };
    reader.readAsBinaryString(file);
  };

  const selectEvent = (event) => {
    setSelectedEvent(event);
    setParticipants(event.participants);
    setView('event-detail');
    setMode('list');
  };

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await videoRef.current.play();
        setScanning(true);
        startQRScanning();
      }
    } catch (err) {
      console.error('Erreur caméra:', err);
      setMessage('❌ Erreur: Impossible d\'accéder à la caméra. Autorisez l\'accès dans les paramètres.');
      playErrorSound();
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
  };

  const startQRScanning = () => {
    // Simulation de scan pour la démo - Dans une vraie app, utilisez html5-qrcode
    scanIntervalRef.current = setInterval(() => {
      const notPresent = participants.filter(p => !p.present);
      
      if (notPresent.length > 0 && Math.random() > 0.95) {
        const randomParticipant = notPresent[Math.floor(Math.random() * notPresent.length)];
        handleScanSuccess(randomParticipant.id);
      }
    }, 500);
  };

  const handleScanSuccess = (scannedId) => {
    const participant = participants.find(p => p.id === scannedId);
    
    if (!participant) {
      setMessage('❌ Code QR non reconnu - Participant introuvable');
      playErrorSound();
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (participant.present) {
      setMessage(`⚠️ ${participant.name} a déjà été scanné !`);
      playErrorSound();
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const updatedParticipants = participants.map(p => 
      p.id === scannedId 
        ? { ...p, present: true, scannedAt: new Date().toLocaleString('fr-FR') }
        : p
    );

    setParticipants(updatedParticipants);
    
    setEvents(prev => prev.map(ev => 
      ev.id === selectedEvent.id 
        ? { ...ev, participants: updatedParticipants }
        : ev
    ));

    setMessage(`✅ ${participant.name} enregistré avec succès !`);
    playSuccessSound();
    
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const togglePresence = (id) => {
    const updatedParticipants = participants.map(p => 
      p.id === id 
        ? { 
            ...p, 
            present: !p.present,
            scannedAt: !p.present ? new Date().toLocaleString('fr-FR') : null
          }
        : p
    );
    
    setParticipants(updatedParticipants);
    
    setEvents(prev => prev.map(ev => 
      ev.id === selectedEvent.id 
        ? { ...ev, participants: updatedParticipants }
        : ev
    ));
  };

  const addManualParticipant = () => {
    if (!manualName.trim()) {
      setMessage('❌ Veuillez renseigner au moins le nom');
      return;
    }

    const newParticipant = {
      id: 'MANUAL_' + Date.now(),
      name: manualName.trim(),
      email: manualEmail.trim() || 'Non renseigné',
      guest: 'Non',
      status: 'Ajouté manuellement',
      manager: 'N/A',
      present: true,
      scannedAt: new Date().toLocaleString('fr-FR')
    };

    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    
    setEvents(prev => prev.map(ev => 
      ev.id === selectedEvent.id 
        ? { ...ev, participants: updatedParticipants }
        : ev
    ));

    setMessage(`✅ ${manualName} ajouté avec succès !`);
    playSuccessSound();
    setManualName('');
    setManualEmail('');
    setShowAddManual(false);
    
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToExcel = () => {
    const exportData = participants.map(p => ({
      'Nom complet (Contact)': p.name,
      'Adresse email (Contact)': p.email,
      'Invité': p.guest,
      'Raison du statut': p.status,
      'Gérant (Contact)': p.manager,
      'Présent': p.present ? 'Oui' : 'Non',
      'Heure d\'arrivée': p.scannedAt || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Émargement');

    const colWidths = [
      { wch: 25 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 20 }
    ];
    ws['!cols'] = colWidths;

    const fileName = `emargement_${selectedEvent.name.replace(/\s+/g, '_')}_${selectedEvent.date}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    setMessage('✅ Fichier Excel exporté avec succès');
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteEvent = (eventId) => {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      setMessage('✅ Événement supprimé');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const presentCount = participants.filter(p => p.present).length;
  const totalCount = participants.length;
  const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const filteredParticipants = participants.filter(participant => {
    if (filterStatus === 'present' && !participant.present) return false;
    if (filterStatus === 'absent' && participant.present) return false;
    
    if (searchQuery.trim() === '') return true;
    
    const query = searchQuery.toLowerCase();
    return (
      participant.name.toLowerCase().includes(query) ||
      participant.email.toLowerCase().includes(query) ||
      participant.manager.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900 mb-2">
                📋 Émargement Événements
              </h1>
              <p className="text-gray-600">Gestion multi-événements avec persistance</p>
            </div>
            {view === 'event-detail' && (
              <button
                onClick={() => {
                  stopCamera();
                  setView('events');
                  setSelectedEvent(null);
                  setParticipants([]);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
              >
                <ArrowLeft size={20} />
                Retour
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg animate-pulse ${
            message.includes('✅') ? 'bg-green-50 text-green-800 border-2 border-green-200' : 
            message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-800 border-2 border-red-200' :
            'bg-yellow-50 text-yellow-800 border-2 border-yellow-200'
          }`}>
            <p className="font-semibold text-lg">{message}</p>
          </div>
        )}

        {view === 'events' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Mes Événements</h2>
              <button
                onClick={() => setView('import')}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold"
              >
                <Plus size={20} />
                Nouvel événement
              </button>
            </div>

            {events.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <Calendar size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-6">Aucun événement créé</p>
                <button
                  onClick={() => setView('import')}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold"
                >
                  Créer mon premier événement
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map(event => {
                  const eventPresentCount = event.participants.filter(p => p.present).length;
                  const eventTotalCount = event.participants.length;
                  const eventPercentage = eventTotalCount > 0 ? Math.round((eventPresentCount / eventTotalCount) * 100) : 0;
                  
                  return (
                    <div key={event.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{event.name}</h3>
                          <p className="text-gray-600 flex items-center gap-2">
                            <Calendar size={16} />
                            {new Date(event.date).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">{eventPresentCount}</div>
                          <div className="text-xs text-gray-600">Présents</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-gray-600">{eventTotalCount}</div>
                          <div className="text-xs text-gray-600">Total</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-indigo-600">{eventPercentage}%</div>
                          <div className="text-xs text-gray-600">Taux</div>
                        </div>
                      </div>

                      <button
                        onClick={() => selectEvent(event)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold"
                      >
                        Gérer cet événement
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'import' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Créer un nouvel événement</h3>
              <button
                onClick={() => setView('events')}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="Ex: Formation Azure 2025"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de l'événement *
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <FileSpreadsheet size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-6">
                Importez votre fichier Excel avec les colonnes :<br />
                <span className="font-semibold">ID d'inscription, Nom complet, Email, Invité, Raison du statut, Gérant</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!newEventName.trim() || !newEventDate}
                className={`px-8 py-4 rounded-lg font-semibold transition-all inline-flex items-center gap-2 ${
                  newEventName.trim() && newEventDate
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Upload size={20} />
                Choisir un fichier Excel
              </button>
            </div>
          </div>
        )}

        {view === 'event-detail' && selectedEvent && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedEvent.name}</h2>
              <p className="text-gray-600 flex items-center gap-2 mb-4">
                <Calendar size={16} />
                {new Date(selectedEvent.date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-sm text-gray-600">Présents</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-600">{totalCount}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600">{presentPercentage}%</div>
                  <div className="text-sm text-gray-600">Taux</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  stopCamera();
                  setMode('scan');
                }}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'scan'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Camera className="inline mr-2" size={20} />
                Scanner
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setMode('list');
                }}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'list'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="inline mr-2" size={20} />
                Liste ({presentCount}/{totalCount})
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                <Download className="inline mr-2" size={20} />
                Exporter
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              {mode === 'scan' && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    Scanner un code QR
                  </h3>
                  
                  {!scanning ? (
                    <div className="text-center">
                      <div className="bg-gray-100 rounded-lg p-12 mb-4">
                        <Camera size={64} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-4">Positionnez le QR code devant la caméra</p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all mb-4"
                      >
                        <Camera className="inline mr-2" size={20} />
                        Démarrer le scanner
                      </button>
                      
                      <div className="mt-6 pt-6 border-t-2">
                        <button
                          onClick={() => setShowAddManual(true)}
                          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all"
                        >
                          <UserPlus className="inline mr-2" size={20} />
                          Ajouter un participant manuellement
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-black rounded-lg overflow-hidden mb-4 relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-96 object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-64 h-64 border-4 border-indigo-500 rounded-lg shadow-lg"></div>
                        </div>
                      </div>
                      <button
                        onClick={stopCamera}
                        className="w-full bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-all"
                      >
                        Arrêter le scanner
                      </button>
                      <div className="mt-4 bg-indigo-50 rounded-lg p-3 text-center text-indigo-800 text-sm">
                        <p>🎥 Caméra active - Présentez le code QR</p>
                      </div>
                    </div>
                  )}

                  {showAddManual && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter un participant</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Nom complet *
                            </label>
                            <input
                              type="text"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              placeholder="Ex: Jean Dupont"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Email (optionnel)
                            </label>
                            <input
                              type="email"
                              value={manualEmail}
                              onChange={(e) => setManualEmail(e.target.value)}
                              placeholder="Ex: jean.dupont@email.com"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowAddManual(false);
                              setManualName('');
                              setManualEmail('');
                            }}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={addManualParticipant}
                            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'list' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Liste des participants
                    </h3>
                    <button
                      onClick={() => setShowAddManual(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-semibold"
                    >
                      <UserPlus size={16} />
                      Ajouter
                    </button>
                  </div>

                  <div className="mb-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="🔍 Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          filterStatus === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Tous ({participants.length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('present')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          filterStatus === 'present'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Présents ({presentCount})
                      </button>
                      <button
                        onClick={() => setFilterStatus('absent')}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          filterStatus === 'absent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Absents ({totalCount - presentCount})
                      </button>
                    </div>
                  </div>

                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Aucun résultat</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            participant.present
                              ? 'bg-green-50 border-green-300'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {participant.present ? (
                                  <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                                ) : (
                                  <XCircle className="text-gray-400 flex-shrink-0" size={20} />
                                )}
                                <p className="font-bold text-gray-900 text-lg">{participant.name}</p>
                              </div>
                              <p className="text-sm text-gray-600 italic ml-7">{participant.email}</p>
                              {participant.manager && participant.manager !== 'N/A' && (
                                <p className="text-sm text-gray-600 ml-7 mt-1">👤 Gérant: {participant.manager}</p>
                              )}
                              {participant.scannedAt && (
                                <p className="text-xs text-green-700 ml-7 mt-2 font-semibold">
                                  ✓ Arrivée: {participant.scannedAt}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => togglePresence(participant.id)}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                participant.present
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {participant.present ? 'Retirer' : 'Marquer'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddManual && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter un participant</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Nom complet *
                            </label>
                            <input
                              type="text"
                              value={manualName}
                              onChange={(e) => setManualName(e.target.value)}
                              placeholder="Ex: Jean Dupont"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Email (optionnel)
                            </label>
                            <input
                              type="email"
                              value={manualEmail}
                              onChange={(e) => setManualEmail(e.target.value)}
                              placeholder="Ex: jean.dupont@email.com"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowAddManual(false);
                              setManualName('');
                              setManualEmail('');
                            }}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={addManualParticipant}
                            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
