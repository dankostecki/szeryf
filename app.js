window.onGoogleLogin = function(response) {
  // Możesz tu przechowywać np. dane użytkownika do wykorzystania dalej
  console.log("Login Google OK! JWT:", response.credential);
  document.getElementById('login').classList.remove('active');
  document.getElementById('main').classList.add('active');
};

document.getElementById('logout').onclick = function() {
  document.getElementById('main').classList.remove('active');
  document.getElementById('login').classList.add('active');
};
