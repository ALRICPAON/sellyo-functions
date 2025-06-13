function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁️";
  }
}

function resetPassword() {
  const email = prompt("Entre ton adresse email pour recevoir un lien de réinitialisation :");
  if (email) {
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js").then(({ initializeApp }) =>
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js").then(({ getAuth, sendPasswordResetEmail }) => {
        const firebaseConfig = {
          apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
          authDomain: "sellyo-3bbdb.firebaseapp.com",
          projectId: "sellyo-3bbdb",
          storageBucket: "sellyo-3bbdb.firebasestorage.app",
          messagingSenderId: "465249279278",
          appId: "1:465249279278:web:319844f7477ab47930eebf",
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        sendPasswordResetEmail(auth, email)
          .then(() => alert("Email de réinitialisation envoyé ✅"))
          .catch((error) => alert("Erreur : " + error.message));
      })
    );
  }
}
