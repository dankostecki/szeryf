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

// ======= WYLOGOWANIE =======
document.getElementById('logout').onclick = function() {
  showScreen('login');
  resetMediaScreen();
};

// ======= WYBÓR I PODGLĄD PLIKÓW =======
let selectedFile = null;

function resetMediaScreen() {
  selectedFile = null;
  document.getElementById('preview').innerHTML = '';
  document.getElementById('upload-drive').disabled = true;
  document.getElementById('progress-bar').style.display = 'none';
  document.getElementById('progress-bar-inner').style.width = '0%';
  document.getElementById('upload-status').innerText = '';
  document.getElementById('photo-input').value = '';
  document.getElementById('video-input').value = '';
  document.getElementById('file-input').value = '';
}

// ======= PROSTE PRZYCISKI - BEZ KOMPLIKACJI =======
document.getElementById('take-photo').onclick = function() {
  document.getElementById('photo-input').click();
};

document.getElementById('record-video').onclick = function() {
  document.getElementById('video-input').click();
};

document.getElementById('choose-file').onclick = function() {
  document.getElementById('file-input').click();
};

// Event listenery
document.getElementById('photo-input').addEventListener('change', handleFileSelect);
document.getElementById('video-input').addEventListener('change', handleFileSelect);
document.getElementById('file-input').addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    selectedFile = e.target.files[0];
    showPreview(selectedFile);
    document.getElementById('upload-drive').disabled = false;
    document.getElementById('upload-status').innerText = '';
  }
}

function showPreview(file) {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    video.style.maxHeight = '240px';
    preview.appendChild(video);
  } else {
    preview.innerText = file.name;
  }
}

// ======= GOOGLE DRIVE UPLOAD =======
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

document.getElementById('upload-drive').onclick = function() {
  if (!selectedFile) return;

  getAccessToken(function(token) {
    const now = new Date();
    const folderName = `szeryf_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

    document.getElementById('upload-status').innerText = "Tworzę folder na Drive...";
    document.getElementById('progress-bar').style.display = 'none';

    createDriveFolder(token, folderName).then(folderId => {
      return shareFolderAnyone(token, folderId).then(() => folderId);
    }).then(folderId => {
      document.getElementById('upload-status').innerText = "Przesyłam plik...";
      document.getElementById('progress-bar').style.display = 'block';
      document.getElementById('progress-bar-inner').style.width = '0%';

      uploadFileToDrive(token, selectedFile, folderId, (progress) => {
        document.getElementById('progress-bar-inner').style.width = `${progress}%`;
      }).then(resp => {
        // UPROSZCZONE: zawsze użyj folderId
        const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
        document.getElementById('upload-status').innerHTML =
          `✅ Plik wrzucony na Drive!<br>
          <a href="${folderLink}" target="_blank">Kliknij, by zobaczyć folder (dostępny dla każdego z linkiem)</a>`;
        resetMediaScreen();
      }).catch(err => {
        document.getElementById('upload-status').innerText = "❌ Błąd uploadu: " + err;
        document.getElementById('progress-bar').style.display = 'none';
      });
    }).catch(err => {
      document.getElementById('upload-status').innerText = "❌ Błąd tworzenia folderu: " + err;
    });
  });
};

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
