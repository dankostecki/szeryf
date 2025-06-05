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
let selectedFiles = [];

function resetMediaScreen() {
  selectedFiles = [];
  document.getElementById('preview').innerHTML = '';
  document.getElementById('upload-drive').disabled = true;
  document.getElementById('progress-bar').style.display = 'none';
  document.getElementById('progress-bar-inner').style.width = '0%';
  document.getElementById('progress-bar-inner-form').style.width = '0%';
  document.getElementById('progress-bar-form').style.display = 'none';
  document.getElementById('upload-status').innerText = '';
  document.getElementById('photo-input').value = '';
  document.getElementById('video-input').value = '';
  document.getElementById('file-input').value = '';
}

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
  document.getElementById('photo-input').addEventListener('change', handleFileSelect);
  document.getElementById('video-input').addEventListener('change', handleFileSelect);
  document.getElementById('file-input').addEventListener('change', handleFileSelect);
  document.getElementById('get-location').onclick = function() {
    if (navigator.geolocation) {
      document.getElementById('location-status').innerText = "Pobieram lokalizację...";
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          document.getElementById('incident-location').value = `${pos.coords.latitude},${pos.coords.longitude}`;
          document.getElementById('location-status').innerText = "Lokalizacja pobrana ✔️";
        },
        function() {
          document.getElementById('location-status').innerText = "Nie udało się pobrać lokalizacji";
        }
      );
    } else {
      document.getElementById('location-status').innerText = "Geolokalizacja niedostępna";
    }
  };
  document.getElementById('incident-form').onsubmit = function(e) {
    e.preventDefault();
    alert(
      'Tytuł: ' + document.getElementById('incident-title').value +
      '\nOpis: ' + document.getElementById('incident-description').value +
      '\nLokalizacja: ' + document.getElementById('incident-location').value
    );
  };
});

// Obsługa wyboru i podglądu plików
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    for (let i = 0; i < e.target.files.length; i++) {
      selectedFiles.push(e.target.files[i]);
    }
    showPreviewGrid();
    document.getElementById('upload-drive').disabled = selectedFiles.length === 0;
    document.getElementById('upload-status').innerText = `Wybrano ${selectedFiles.length} plik(ów)`;
    e.target.value = '';
  }
}

function showPreviewGrid() {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  if (selectedFiles.length === 0) return;
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

// Usuń plik z listy
function removeFile(index) {
  selectedFiles.splice(index, 1);
  showPreviewGrid();
  document.getElementById('upload-drive').disabled = selectedFiles.length === 0;
  document.getElementById('upload-status').innerText = selectedFiles.length > 0 ? `Wybrano ${selectedFiles.length} plik(ów)` : '';
}

// Pasek postępu w obu sekcjach
function updateProgressBar(percent) {
  let el1 = document.getElementById('progress-bar-inner');
  let el2 = document.getElementById('progress-bar-inner-form');
  if (el1) el1.style.width = percent + '%';
  if (el2) el2.style.width = percent + '%';
}

// Skopiuj preview kafelków do formularza (bez kasowania) — bezpiecznie!
function copyEvidencePreviewToForm() {
  try {
    const src = document.querySelector('#preview .preview-grid');
    const dest = document.getElementById('evidence-preview');
    if (src && dest) {
      dest.innerHTML = src.outerHTML;
      dest.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    } else if (dest) {
      dest.innerHTML = '<em>Brak podglądu plików</em>';
    }
  } catch (e) {
    const dest = document.getElementById('evidence-preview');
    if (dest) dest.innerHTML = '<em>Błąd wyświetlania podglądu</em>';
  }
}

// ======= UPLOAD DO DRIVE (w tle, postęp na obu ekranach, formularz aktywny od razu) =======
let accessToken = null;

document.getElementById('upload-drive').onclick = function() {
  if (selectedFiles.length === 0) return;
  showScreen('form-screen');
  copyEvidencePreviewToForm();
  document.getElementById('progress-bar').style.display = 'block';
  document.getElementById('progress-bar-form').style.display = 'block';
  getAccessToken(function(token) {
    const now = new Date();
    const folderName = `szeryf_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    document.getElementById('upload-status').innerText = "Tworzę folder na Drive...";
    createDriveFolder(token, folderName).then(folderId => {
      return shareFolderAnyone(token, folderId).then(() => folderId);
    }).then(folderId => {
      document.getElementById('upload-status').innerText = `Przesyłam pliki (${selectedFiles.length})...`;
      uploadMultipleFilesToDrive(token, selectedFiles, folderId, (progress) => {
        updateProgressBar(progress);
      }).then(resp => {
        const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
        document.getElementById('upload-status').innerHTML =
          `✅ Wszystkie pliki wrzucone na Drive!<br>
          <a href="${folderLink}" target="_blank">Zobacz folder (publiczny)</a>`;
        document.getElementById('progress-bar').style.display = 'none';
        document.getElementById('progress-bar-form').style.display = 'none';
      }).catch(err => {
        document.getElementById('upload-status').innerText = "❌ Błąd uploadu: " + err;
        document.getElementById('progress-bar').style.display = 'none';
        document.getElementById('progress-bar-form').style.display = 'none';
      });
    });
  });
};

// MULTI-UPLOAD
function uploadMultipleFilesToDrive(token, files, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    let uploadedCount = 0;
    let errors = [];
    const uploadNext = (index) => {
      if (index >= files.length) {
        if (errors.length > 0) reject(`Błędy przy ${errors.length} plikach: ${errors.join(', ')}`);
        else resolve(`Przesłano ${uploadedCount} plików`);
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

// Google Drive funkcje
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
function createDriveFolder(token, folderName) {
  return fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' })
  }).then(r => r.json()).then(data => data.id);
}
function shareFolderAnyone(token, folderId) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  }).then(r => r.json());
}
function uploadFileToDrive(token, file, folderId, onProgress) {
  return new Promise((resolve, reject) => {
    const metadata = { name: file.name, parents: [folderId] };
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
      xhr.onerror = function() { reject("Błąd połączenia z Google Drive"); };
      xhr.send(multipartRequestBody);
    };
    reader.readAsArrayBuffer(file);
  });
}
