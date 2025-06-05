// ======= ZARZĄDZANIE EKRANAMI =======
function showScreen(id) {
  document.querySelectorAll('section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ======= LOGOWANIE =======
window.onGoogleLogin = function(response) {
  showScreen('media-screen');
  resetMediaScreen();
};

// ======= STAN APLIKACJI =======
let selectedFiles = [];
let uploadInProgress = false;
let currentLocation = null;
let uploadResults = null;

function resetMediaScreen() {
  selectedFiles = [];
  uploadInProgress = false;
  uploadResults = null;
  currentLocation = null;
  
  document.getElementById('preview').innerHTML = '';
  document.getElementById('upload-drive').disabled = true;
  document.getElementById('progress-bar-global').style.display = 'none';
  document.getElementById('progress-bar-inner-global').style.width = '0%';
  document.getElementById('upload-status-global').innerText = '';
  document.getElementById('photo-input').value = '';
  document.getElementById('video-input').value = '';
  document.getElementById('file-input').value = '';
  
  // Reset formularza
  document.getElementById('incident-title').value = '';
  document.getElementById('incident-description').value = '';
  document.getElementById('location-display').innerText = '';
}

// ======= PROSTE PRZYCISKI - BEZ KOMPLIKACJI =======
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('take-photo').onclick = function() {
    document.getElementById('photo-input').click();
  };
  
  document.getElementById('record-video').onclick = function() {
    document.getElementById('video-input').click();
  };

  document.getElementById('choose-file').onclick = function() {
    document.getElementById('file-input').click();
  };

  document.getElementById('logout').onclick = function() {
    showScreen('login');
    resetMediaScreen();
  };

  // NOWY: Przycisk przejścia do formularza
  document.getElementById('continue-to-form').onclick = function() {
    showScreen('incident-form');
    updateEvidenceCounter();
    
    // Jeśli nie ma jeszcze lokalizacji, spróbuj ją pobrać
    if (!currentLocation) {
      getCurrentLocation();
    }
  };

  // NOWY: Przycisk powrotu do dodawania plików
  document.getElementById('back-to-media').onclick = function() {
    showScreen('media-screen');
  };

  // Upload button - ZMIENIONY dla uploadu w tle
  document.getElementById('upload-drive').onclick = function() {
    if (selectedFiles.length === 0) return;
    
    startBackgroundUpload();
  };

  // NOWY: Przycisk wykrycia lokalizacji
  document.getElementById('detect-location').onclick = function() {
    getCurrentLocation();
  };

  // NOWY: Przycisk wysłania zgłoszenia
  document.getElementById('submit-incident').onclick = function() {
    submitIncident();
  };

  // Event listenery dla inputów
  document.getElementById('photo-input').addEventListener('change', handleFileSelect);
  document.getElementById('video-input').addEventListener('change', handleFileSelect);
  document.getElementById('file-input').addEventListener('change', handleFileSelect);
});

// ======= OBSŁUGA PLIKÓW =======
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    for (let i = 0; i < e.target.files.length; i++) {
      selectedFiles.push(e.target.files[i]);
    }
    
    showPreviewGrid();
    updateButtons();
    e.target.value = '';
  }
}

function showPreviewGrid() {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  
  if (selectedFiles.length === 0) {
    return;
  }
  
  const grid = document.createElement('div');
  grid.className = 'preview-grid';
  
  selectedFiles.forEach((file, index) => {
    const tile = document.createElement('div');
    tile.className = 'preview-tile';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      removeFile(index);
    };
    
    const filePreview = document.createElement('div');
    filePreview.className = 'file-content';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      filePreview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.preload = 'metadata';
      filePreview.appendChild(video);
    } else {
      const fileIcon = document.createElement('div');
      fileIcon.className = 'file-icon';
      fileIcon.innerHTML = '📄';
      filePreview.appendChild(fileIcon);
    }
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    tile.appendChild(deleteBtn);
    tile.appendChild(filePreview);
    tile.appendChild(fileName);
    grid.appendChild(tile);
  });
  
  preview.appendChild(grid);
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  showPreviewGrid();
  updateButtons();
}

function updateButtons() {
  const hasFiles = selectedFiles.length > 0;
  document.getElementById('upload-drive').disabled = !hasFiles || uploadInProgress;
  document.getElementById('continue-to-form').disabled = !hasFiles;
  
  const status = hasFiles ? `Wybrano ${selectedFiles.length} plik(ów)` : '';
  document.getElementById('upload-status-media').innerText = status;
}

// ======= UPLOAD W TLE =======
function startBackgroundUpload() {
  if (uploadInProgress || selectedFiles.length === 0) return;
  
  uploadInProgress = true;
  updateButtons();
  
  getAccessToken(function(token) {
    const now = new Date();
    const folderName = `szeryf_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

    document.getElementById('upload-status-global').innerText = "Tworzę folder na Drive...";
    document.getElementById('progress-bar-global').style.display = 'block';

    createDriveFolder(token, folderName).then(folderId => {
      return shareFolderAnyone(token, folderId).then(() => folderId);
    }).then(folderId => {
      document.getElementById('upload-status-global').innerText = `Przesyłam pliki (${selectedFiles.length})...`;

      uploadMultipleFilesToDrive(token, selectedFiles, folderId, (progress) => {
        document.getElementById('progress-bar-inner-global').style.width = `${progress}%`;
      }).then(resp => {
        const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
        
        uploadResults = {
          folderLink: folderLink,
          folderId: folderId,
          fileCount: selectedFiles.length
        };
        
        document.getElementById('upload-status-global').innerHTML =
          `✅ Wszystkie pliki (${selectedFiles.length}) wrzucone na Drive!`;
        
        uploadInProgress = false;
        updateButtons();
        
        // Auto-przejście do formularza po udanym uploade
        if (document.getElementById('media-screen').classList.contains('active')) {
          setTimeout(() => {
            document.getElementById('continue-to-form').click();
          }, 1500);
        }
        
      }).catch(err => {
        document.getElementById('upload-status-global').innerText = "❌ Błąd uploadu: " + err;
        document.getElementById('progress-bar-global').style.display = 'none';
        uploadInProgress = false;
        updateButtons();
      });
    }).catch(err => {
      document.getElementById('upload-status-global').innerText = "❌ Błąd tworzenia folderu: " + err;
      uploadInProgress = false;
      updateButtons();
    });
  });
}

// ======= GEOLOKALIZACJA =======
function getCurrentLocation() {
  const locationBtn = document.getElementById('detect-location');
  const locationDisplay = document.getElementById('location-display');
  
  locationBtn.disabled = true;
  locationBtn.innerText = 'Wykrywam lokalizację...';
  
  if (!navigator.geolocation) {
    locationDisplay.innerText = 'Geolokalizacja nie jest obsługiwana';
    locationBtn.disabled = false;
    locationBtn.innerText = '📍 Wykryj lokalizację';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      currentLocation = { lat, lng };
      
      // Spróbuj pobrać nazwę miejsca (reverse geocoding)
      try {
        // Prosty sposób bez zewnętrznych API - można rozbudować
        locationDisplay.innerHTML = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}<br><small>Kliknij aby zmienić na mapie</small>`;
        locationDisplay.onclick = () => openMapSelector(lat, lng);
        
      } catch (error) {
        locationDisplay.innerHTML = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}<br><small>Kliknij aby zmienić na mapie</small>`;
        locationDisplay.onclick = () => openMapSelector(lat, lng);
      }
      
      locationBtn.disabled = false;
      locationBtn.innerText = '📍 Wykryj ponownie';
    },
    (error) => {
      locationDisplay.innerText = 'Nie można pobrać lokalizacji. Kliknij aby wybrać na mapie.';
      locationDisplay.onclick = () => openMapSelector();
      locationBtn.disabled = false;
      locationBtn.innerText = '📍 Wykryj lokalizację';
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

function openMapSelector(defaultLat = 52.2297, defaultLng = 21.0122) {
  // Prosta mapa w popup - można rozbudować o Google Maps API
  const mapUrl = `https://www.google.com/maps/@${defaultLat},${defaultLng},15z`;
  const confirmed = confirm(`Aktualnie wybrana lokalizacja:\nLat: ${defaultLat.toFixed(6)}\nLng: ${defaultLng.toFixed(6)}\n\nKliknij OK aby otworzyć mapy Google i wybrać dokładną lokalizację.`);
  
  if (confirmed) {
    window.open(mapUrl, '_blank');
    // W prawdziwej implementacji można by dodać Google Maps widget
  }
}

// ======= FORMULARZ INCYDENTU =======
function updateEvidenceCounter() {
  const counter = document.getElementById('evidence-counter');
  counter.innerText = `Your Evidence (${selectedFiles.length})`;
  
  const evidencePreview = document.getElementById('evidence-preview');
  evidencePreview.innerHTML = '';
  
  if (selectedFiles.length > 0) {
    const preview = document.createElement('div');
    preview.className = 'evidence-mini-grid';
    
    selectedFiles.slice(0, 3).forEach(file => {
      const thumb = document.createElement('div');
      thumb.className = 'evidence-thumb';
      
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        thumb.appendChild(img);
      } else if (file.type.startsWith('video/')) {
        thumb.innerHTML = '🎥';
        thumb.classList.add('video-thumb');
      } else {
        thumb.innerHTML = '📄';
        thumb.classList.add('file-thumb');
      }
      
      preview.appendChild(thumb);
    });
    
    if (selectedFiles.length > 3) {
      const more = document.createElement('div');
      more.className = 'evidence-thumb more-thumb';
      more.innerHTML = `+${selectedFiles.length - 3}`;
      preview.appendChild(more);
    }
    
    evidencePreview.appendChild(preview);
  }
}

function submitIncident() {
  const title = document.getElementById('incident-title').value.trim();
  const description = document.getElementById('incident-description').value.trim();
  
  if (!title) {
    alert('Proszę wprowadzić tytuł incydentu');
    return;
  }
  
  if (!description) {
    alert('Proszę opisać co się wydarzyło');
    return;
  }
  
  if (!uploadResults) {
    alert('Pliki muszą być najpierw przesłane na Drive');
    return;
  }
  
  // Podsumowanie zgłoszenia
  let summary = `✅ ZGŁOSZENIE WYSŁANE!\n\n`;
  summary += `📋 Tytuł: ${title}\n`;
  summary += `📝 Opis: ${description}\n`;
  summary += `📂 Pliki: ${uploadResults.fileCount} plik(ów) na Drive\n`;
  
  if (currentLocation) {
    summary += `📍 Lokalizacja: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}\n`;
  }
  
  summary += `\n🔗 Link do plików:\n${uploadResults.folderLink}`;
  
  alert(summary);
  
  // Reset i powrót do początku
  showScreen('media-screen');
  resetMediaScreen();
}

// ======= GOOGLE DRIVE FUNKCJE (ZACHOWANE) =======
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
          reject(`Błędy przy ${errors.length} plikach: ${errors.join(', ')}`);
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
