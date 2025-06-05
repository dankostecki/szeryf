// ======= ZARZĄDZANIE EKRANAMI =======
function showScreen(id) {
  document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ======= LOGOWANIE =======
window.onGoogleLogin = function(response) {
  showScreen('capture-evidence');
  resetApp();
};

// ======= STAN APLIKACJI =======
let selectedFiles = [];
let uploadInProgress = false;
let currentLocation = null;
let uploadResults = null;
let reportData = {};

function resetApp() {
  selectedFiles = [];
  uploadInProgress = false;
  uploadResults = null;
  currentLocation = null;
  reportData = {};
  
  document.getElementById('media-preview').innerHTML = '';
  document.getElementById('progress-bar-global').style.display = 'none';
  document.getElementById('progress-bar-inner-global').style.width = '0%';
  document.getElementById('upload-status-global').innerText = '';
  document.getElementById('photo-input').value = '';
  document.getElementById('video-input').value = '';
  document.getElementById('file-input').value = '';
  
  // Reset formularzy
  document.getElementById('incident-title').value = '';
  document.getElementById('incident-description').value = '';
  document.getElementById('location-input').value = '';
  document.getElementById('police-dept').checked = true;
  document.getElementById('custom-email').checked = false;
}

// ======= INICJALIZACJA =======
document.addEventListener('DOMContentLoaded', function() {
  // Przyciski dodawania mediów
  document.getElementById('photo-btn').onclick = function() {
    document.getElementById('photo-input').click();
  };
  
  document.getElementById('video-btn').onclick = function() {
    document.getElementById('video-input').click();
  };

  // Przycisk Continue to Report
  document.getElementById('continue-to-report').onclick = function() {
    if (selectedFiles.length === 0) {
      alert('Proszę dodać przynajmniej jeden plik');
      return;
    }
    
    // Rozpocznij upload w tle i przejdź do formularza
    startBackgroundUpload();
    showScreen('incident-details');
    getCurrentLocation();
  };

  // Przycisk Continue to Recipient
  document.getElementById('continue-to-recipient').onclick = function() {
    if (!validateIncidentForm()) return;
    
    saveIncidentData();
    showScreen('send-report');
    updateRecipientScreen();
  };

  // Przycisk Send Report
  document.getElementById('send-report-btn').onclick = function() {
    sendFinalReport();
  };

  // Przycisk Submit Another Report
  document.getElementById('submit-another').onclick = function() {
    showScreen('capture-evidence');
    resetApp();
  };

  // Logout
  document.getElementById('logout').onclick = function() {
    showScreen('login');
    resetApp();
  };

  // Event listenery dla inputów
  document.getElementById('photo-input').addEventListener('change', handleFileSelect);
  document.getElementById('video-input').addEventListener('change', handleFileSelect);
});

// ======= OBSŁUGA PLIKÓW =======
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    for (let i = 0; i < e.target.files.length; i++) {
      selectedFiles.push(e.target.files[i]);
    }
    
    updateMediaPreview();
    updateContinueButton();
    e.target.value = '';
  }
}

function updateMediaPreview() {
  const preview = document.getElementById('media-preview');
  const mediaCount = document.getElementById('media-count');
  
  if (selectedFiles.length === 0) {
    preview.style.display = 'none';
    mediaCount.style.display = 'none';
    return;
  }
  
  preview.style.display = 'block';
  mediaCount.style.display = 'block';
  mediaCount.textContent = `Twoje media (${selectedFiles.length})`;
  
  // Wyczyść preview
  const grid = preview.querySelector('.media-grid');
  grid.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    const tile = document.createElement('div');
    tile.className = 'media-tile';
    
    // Ikona usuń
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-media-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      removeFile(index);
    };
    
    // Podgląd pliku  
    const content = document.createElement('div');
    content.className = 'media-content';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      content.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.preload = 'metadata';
      content.appendChild(video);
    } else {
      content.innerHTML = `<div class="file-placeholder">PLIK</div>`;
    }
    
    // Tekst na dole
    const label = document.createElement('div');
    label.className = 'media-label';
    label.textContent = 'Moja Spiżarnia';
    
    tile.appendChild(deleteBtn);
    tile.appendChild(content);
    tile.appendChild(label);
    grid.appendChild(tile);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateMediaPreview();
  updateContinueButton();
}

function updateContinueButton() {
  const btn = document.getElementById('continue-to-report');
  btn.disabled = selectedFiles.length === 0;
}

// ======= UPLOAD W TLE =======
function startBackgroundUpload() {
  if (uploadInProgress || selectedFiles.length === 0) return;
  
  uploadInProgress = true;
  
  getAccessToken(function(token) {
    const now = new Date();
    const folderName = `szeryf_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

    document.getElementById('upload-status-global').innerText = "Przesyłanie plików na Drive...";
    document.getElementById('progress-bar-global').style.display = 'block';

    createDriveFolder(token, folderName).then(folderId => {
      return shareFolderAnyone(token, folderId).then(() => folderId);
    }).then(folderId => {
      uploadMultipleFilesToDrive(token, selectedFiles, folderId, (progress) => {
        document.getElementById('progress-bar-inner-global').style.width = `${progress}%`;
      }).then(resp => {
        const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
        
        uploadResults = {
          folderLink: folderLink,
          folderId: folderId,
          fileCount: selectedFiles.length
        };
        
        document.getElementById('upload-status-global').innerHTML = `Pliki przesłane pomyślnie`;
        uploadInProgress = false;
        
      }).catch(err => {
        document.getElementById('upload-status-global').innerText = "Błąd przesyłania: " + err;
        uploadInProgress = false;
      });
    });
  });
}

// ======= GEOLOKALIZACJA =======
function getCurrentLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      currentLocation = { lat, lng };
      
      // Spróbuj uzyskać nazwę miejsca
      document.getElementById('location-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    },
    (error) => {
      console.log('Nie można pobrać lokalizacji:', error);
    }
  );
}

// ======= FORMULARZ INCYDENTU =======
function validateIncidentForm() {
  const title = document.getElementById('incident-title').value.trim();
  const description = document.getElementById('incident-description').value.trim();
  
  if (!title) {
    alert('Proszę wprowadzić tytuł incydentu');
    return false;
  }
  
  if (!description) {
    alert('Proszę opisać incydent');
    return false;
  }
  
  return true;
}

function saveIncidentData() {
  reportData = {
    title: document.getElementById('incident-title').value.trim(),
    description: document.getElementById('incident-description').value.trim(),
    location: document.getElementById('location-input').value.trim() || 'Nie określono',
    timestamp: new Date().toLocaleString('pl-PL'),
    fileCount: selectedFiles.length
  };
}

function updateIncidentEvidence() {
  const evidenceCount = document.getElementById('evidence-count');
  const evidenceGrid = document.getElementById('evidence-grid');
  
  evidenceCount.textContent = `Twoje dowody (${selectedFiles.length})`;
  
  evidenceGrid.innerHTML = '';
  
  selectedFiles.forEach(file => {
    const tile = document.createElement('div');
    tile.className = 'evidence-tile';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      tile.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      tile.innerHTML = '<div class="video-placeholder">FILM</div>';
    } else {
      tile.innerHTML = '<div class="file-placeholder">PLIK</div>';
    }
    
    const label = document.createElement('div');
    label.className = 'evidence-label';
    label.textContent = 'Moja Spiżarnia';
    tile.appendChild(label);
    
    evidenceGrid.appendChild(tile);
  });
}

// Aktualizuj dowody gdy przejdziemy do formularza
document.addEventListener('DOMContentLoaded', function() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target.id === 'incident-details' && mutation.target.classList.contains('active')) {
        updateIncidentEvidence();
      }
    });
  });
  
  observer.observe(document.body, {
    subtree: true,
    attributeFilter: ['class']
  });
});

// ======= WYBÓR ODBIORCY =======
function updateRecipientScreen() {
  // Tutaj można dodać logikę wyboru departamentu
}

// ======= WYSŁANIE RAPORTU =======
function sendFinalReport() {
  if (!uploadResults) {
    alert('Pliki muszą być najpierw przesłane');
    return;
  }
  
  const isPolice = document.getElementById('police-dept').checked;
  const recipient = isPolice ? 'Komenda Policji - Północny Okręg' : 'Niestandardowy email';
  const email = isPolice ? 'north@police.gov.pl' : 'custom@example.com';
  
  // Pokaż ekran potwierdzenia
  showConfirmationScreen(recipient, email);
}

function showConfirmationScreen(recipient, email) {
  // Aktualizuj dane na ekranie potwierdzenia
  document.getElementById('sent-to-name').textContent = recipient;
  document.getElementById('sent-to-email').textContent = email;
  document.getElementById('report-title-summary').textContent = reportData.title;
  document.getElementById('report-location-summary').textContent = reportData.location;
  
  // Aktualizuj dowody
  const attachedGrid = document.getElementById('attached-evidence-grid');
  attachedGrid.innerHTML = '';
  
  selectedFiles.forEach(file => {
    const tile = document.createElement('div');
    tile.className = 'evidence-tile';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      tile.appendChild(img);
    } else {
      tile.innerHTML = '<div class="file-placeholder">FILM</div>';
    }
    
    const label = document.createElement('div');
    label.className = 'evidence-label';
    label.textContent = 'Moja Spiżarnia';
    tile.appendChild(label);
    
    attachedGrid.appendChild(tile);
  });
  
  showScreen('report-submitted');
}

// ======= GOOGLE DRIVE FUNKCJE =======
let accessToken = null;

function getAccessToken(callback) {
  if (accessToken) return callback(accessToken);
  google.accounts.oauth2.initTokenClient({
    client_id: '437810978274-a5194s6ib5pgv5gjs47fknreqspiv35g.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      callback(accessToken);
    },
  }).requestAccessToken();
}

function uploadMultipleFilesToDrive(token, files, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    let uploadedCount = 0;
    let errors = [];
    
    const uploadNext = (index) => {
      if (index >= files.length) {
        if (errors.length > 0) {
          reject(`Błędy przy ${errors.length} plikach`);
        } else {
          resolve(`Przesłano ${uploadedCount} plików`);
        }
        return;
      }
      
      const file = files[index];
      uploadFileToDrive(token, file, folderId, () => {
        const overallProgress = Math.round(((index + 0.5) / files.length) * 100);
        onProgress(overallProgress);
      }).then(() => {
        uploadedCount++;
        const overallProgress = Math.round(((index + 1) / files.length) * 100);
        onProgress(overallProgress);
        uploadNext(index + 1);
      }).catch(err => {
        errors.push(file.name);
        uploadNext(index + 1);
      });
    };
    
    uploadNext(0);
  });
}

function createDriveFolder(token, folderName) {
  return fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  })
    .then(r => r.json())
    .then(data => data.id);
}

function shareFolderAnyone(token, folderId) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  }).then(r => r.json());
}

function uploadFileToDrive(token, file, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const reader = new FileReader();
    reader.onload = function(e) {
      const contentType = file.type || 'application/octet-stream';
      const base64Data = btoa(
        new Uint8Array(e.target.result)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.setRequestHeader('Content-Type', 'multipart/related; boundary="' + boundary + '"');

      xhr.upload.onprogress = function(event) {
        if (event.lengthComputable && typeof onProgress === 'function') {
          let percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = function() {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.response));
        } else {
          reject(xhr.responseText);
        }
      };

      xhr.onerror = function() {
        reject("Błąd połączenia z Google Drive");
      };

      xhr.send(multipartRequestBody);
    };
    reader.readAsArrayBuffer(file);
  });
}
