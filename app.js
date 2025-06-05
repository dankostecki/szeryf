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

// ======= WYBÓR I PODGLĄD PLIKÓW =======
let selectedFile = null;
let cameraStream = null; // NOWE: stream kamery

function resetMediaScreen() {
  selectedFile = null;
  const preview = document.getElementById('preview');
  if (preview) preview.innerHTML = '';
  
  const uploadBtn = document.getElementById('upload-drive');
  if (uploadBtn) uploadBtn.disabled = true;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.display = 'none';
  
  const progressInner = document.getElementById('progress-bar-inner');
  if (progressInner) progressInner.style.width = '0%';
  
  const statusEl = document.getElementById('upload-status');
  if (statusEl) statusEl.innerText = '';
  
  const photoInput = document.getElementById('photo-input');
  if (photoInput) photoInput.value = '';
  
  const videoInput = document.getElementById('video-input');
  if (videoInput) videoInput.value = '';
  
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
  
  stopCamera(); // NOWE: zatrzymaj kamerę
}

// ======= OBSŁUGA PRZYCISKÓW - NAPRAWIONA =======

// BEZPIECZNA inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function() {
  initializeEventListeners();
});

// Fallback dla starszych przeglądarek
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

function initializeEventListeners() {
  // ZMIANA: Hybrydowe podejście do aparatu
  const takePhotoBtn = document.getElementById('take-photo');
  if (takePhotoBtn) {
    takePhotoBtn.onclick = function() {
      startCamera();
    };
  }

  const recordVideoBtn = document.getElementById('record-video');
  if (recordVideoBtn) {
    recordVideoBtn.onclick = function() {
      const videoInput = document.getElementById('video-input');
      if (videoInput) videoInput.click();
    };
  }

  const chooseFileBtn = document.getElementById('choose-file');
  if (chooseFileBtn) {
    chooseFileBtn.onclick = function() {
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.click();
    };
  }

  // Event listenery dla inputów
  const photoInput = document.getElementById('photo-input');
  if (photoInput) {
    photoInput.addEventListener('change', handleFileSelect);
  }

  const videoInput = document.getElementById('video-input');
  if (videoInput) {
    videoInput.addEventListener('change', handleFileSelect);
  }

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Upload button
  const uploadBtn = document.getElementById('upload-drive');
  if (uploadBtn) {
    uploadBtn.onclick = handleUpload;
  }

  // Logout button
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      showScreen('login');
      resetMediaScreen();
      stopCamera();
    };
  }
}

// ======= NOWE: FUNKCJE KAMERY JAVASCRIPT =======

async function startCamera() {
  try {
    // SPRAWDŹ czy elementy istnieją
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraSection = document.getElementById('cameraSection');
    
    if (!cameraVideo || !cameraSection) {
      throw new Error('Elementy kamery nie zostały znalezione w DOM');
    }

    // Sprawdź wsparcie
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Twoja przeglądarka nie obsługuje kamery');
    }

    // Najpierw spróbuj kamerę tylną
    let constraints = { 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    };

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (envError) {
      console.log('Kamera tylna niedostępna, próbuję z przednią:', envError.message);
      constraints = { 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    }
    
    // BEZPIECZNE ustawienie srcObject
    cameraVideo.srcObject = cameraStream;
    
    cameraVideo.onloadedmetadata = () => {
      cameraVideo.play();
      cameraSection.style.display = 'block';
    };
    
  } catch (error) {
    console.error('Błąd kamery:', error);
    showError('Błąd kamery: ' + error.message + ' - spróbuj "Wybierz plik"');
    
    // FALLBACK: jeśli kamera JS nie działa, spróbuj input
    setTimeout(() => {
      const photoInput = document.getElementById('photo-input');
      if (photoInput) {
        photoInput.click();
      }
    }, 1000);
  }
}

function capturePhoto() {
  try {
    const canvas = document.getElementById('captureCanvas');
    const video = document.getElementById('cameraVideo');
    
    // SPRAWDŹ czy elementy istnieją
    if (!canvas || !video) {
      throw new Error('Elementy kamery nie zostały znalezione');
    }
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      showError('Kamera jeszcze się ładuje. Spróbuj ponownie za chwilę.');
      return;
    }
    
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        showError('Nie udało się przechwycić zdjęcia. Spróbuj ponownie.');
        return;
      }
      
      // Utwórz File object z blob
      selectedFile = new File([blob], 'zdjecie.jpg', { type: 'image/jpeg' });
      
      const url = URL.createObjectURL(blob);
      showPreview(selectedFile, url);
      
      const uploadBtn = document.getElementById('upload-drive');
      if (uploadBtn) {
        uploadBtn.disabled = false;
      }
      stopCamera();
      
    }, 'image/jpeg', 0.95);
    
  } catch (error) {
    console.error('Błąd podczas robienia zdjęcia:', error);
    showError('Błąd podczas robienia zdjęcia: ' + error.message);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  
  const cameraVideo = document.getElementById('cameraVideo');
  if (cameraVideo) {
    cameraVideo.srcObject = null;
  }
  
  const cameraSection = document.getElementById('cameraSection');
  if (cameraSection) {
    cameraSection.style.display = 'none';
  }
}

// ======= OBSŁUGA WYBORU PLIKÓW =======

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    selectedFile = e.target.files[0];
    showPreview(selectedFile);
    
    const uploadBtn = document.getElementById('upload-drive');
    if (uploadBtn) uploadBtn.disabled = false;
    
    const statusEl = document.getElementById('upload-status');
    if (statusEl) statusEl.innerText = '';
  }
}

// ZMIANA: Dodaj obsługę customUrl dla zdjęć z kamery
function showPreview(file, customUrl = null) {
  const preview = document.getElementById('preview');
  if (!preview) return;
  
  preview.innerHTML = '';
  
  const url = customUrl || URL.createObjectURL(file);
  
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '6px';
    preview.appendChild(img);
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.maxHeight = '240px';
    video.style.maxWidth = '100%';
    preview.appendChild(video);
  } else {
    preview.innerText = file.name;
  }
}

// NOWE: Funkcja do wyświetlania błędów
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.innerHTML = '❌ ' + message;
  
  const preview = document.getElementById('preview');
  if (preview) {
    preview.innerHTML = '';
    preview.appendChild(errorDiv);
  }
}

// ======= GOOGLE DRIVE UPLOAD - NAPRAWIONE =======
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

function handleUpload() {
  if (!selectedFile) return;

  getAccessToken(function(token) {
    const now = new Date();
    const folderName = `szeryf_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

    const statusEl = document.getElementById('upload-status');
    if (statusEl) statusEl.innerText = "Tworzę folder na Drive...";
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.display = 'none';

    createDriveFolder(token, folderName)
      .then(folderId => {
        console.log('Created folder ID:', folderId); // Debug
        return shareFolderAnyone(token, folderId).then(() => folderId);
      })
      .then(folderId => {
        console.log('Sharing folder ID:', folderId); // Debug
        if (statusEl) statusEl.innerText = "Przesyłam plik...";
        if (progressBar) progressBar.style.display = 'block';
        
        const progressInner = document.getElementById('progress-bar-inner');
        if (progressInner) progressInner.style.width = '0%';

        return uploadFileToDrive(token, selectedFile, folderId, (progress) => {
          if (progressInner) progressInner.style.width = `${progress}%`;
        }).then(resp => {
          console.log('Upload response:', resp); // Debug
          
          // NAPRAWKA: Bezpieczne pobieranie folder ID
          let folderLink;
          if (resp.parents && resp.parents.length > 0) {
            folderLink = `https://drive.google.com/drive/folders/${resp.parents[0]}`;
          } else {
            // Fallback: użyj folderId z wcześniejszego kroku
            folderLink = `https://drive.google.com/drive/folders/${folderId}`;
          }
          
          if (statusEl) {
            statusEl.innerHTML =
              `✅ Plik wrzucony na Drive!<br>
              <a href="${folderLink}" target="_blank">Kliknij, by zobaczyć folder (dostępny dla każdego z linkiem)</a>`;
          }
          resetMediaScreen();
        });
      })
      .catch(err => {
        console.error('Upload error:', err); // Debug
        if (statusEl) statusEl.innerText = "❌ Błąd uploadu: " + err;
        if (progressBar) progressBar.style.display = 'none';
      });
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
    .then(r => {
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })
    .then(data => {
      console.log('Folder created:', data); // Debug
      if (!data.id) {
        throw new Error('Brak ID utworzonego folderu');
      }
      return data.id;
    })
    .catch(error => {
      console.error('Error creating folder:', error);
      throw error;
    });
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
  })
    .then(r => {
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })
    .then(data => {
      console.log('Folder shared:', data); // Debug
      return data;
    })
    .catch(error => {
      console.error('Error sharing folder:', error);
      throw error;
    });
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
          try {
            const response = JSON.parse(xhr.response);
            console.log('Raw API response:', response); // Debug
            
            // NAPRAWKA: Dodaj parents jeśli ich brak
            if (!response.parents) {
              response.parents = [folderId];
            }
            
            resolve(response);
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            reject("Błąd parsowania odpowiedzi z Google Drive");
          }
        } else {
          console.error('HTTP Error:', xhr.status, xhr.responseText);
          reject(`HTTP ${xhr.status}: ${xhr.responseText}`);
        }
      };

      xhr.onerror = function() {
        console.error('Network error during upload');
        reject("Błąd połączenia z Google Drive");
      };

      xhr.send(multipartRequestBody);
    };
    
    reader.onerror = function() {
      reject("Błąd odczytu pliku");
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// ======= SPRAWDZENIE DOSTĘPNOŚCI KAMERY =======
window.addEventListener('load', async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      console.warn('Brak dostępnych kamer');
      const takePhotoBtn = document.getElementById('take-photo');
      if (takePhotoBtn) {
        takePhotoBtn.innerText = '📁 Wybierz zdjęcie (brak kamery)';
      }
    } else {
      console.log(`Znaleziono ${videoDevices.length} kamer:`, videoDevices);
    }
  } catch (error) {
    console.warn('Nie można sprawdzić dostępności kamer:', error);
  }
});
