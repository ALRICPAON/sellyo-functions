import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
  authDomain: "sellyo-3bbdb.firebaseapp.com",
  projectId: "sellyo-3bbdb",
  storageBucket: "sellyo-3bbdb.firebasestorage.app",
  messagingSenderId: "465249279278",
  appId: "1:465249279278:web:319844f7477ab47930eebf"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔐 Connexion
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Connexion réussie !");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert("Erreur : " + error.message);
    }
  });
}

// 📝 Enregistrement (si page register.html existe)
if (document.getElementById("registerForm")) {
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password !== confirm) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Compte créé avec succès !");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert("Erreur : " + error.message);
    }
  });
}
