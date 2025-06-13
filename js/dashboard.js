import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// 🔐 Vérifie si l'utilisateur est connecté
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = document.getElementById("userEmail");
    if (userEmail) userEmail.textContent = "Connecté en tant que : " + user.email;
  } else {
    window.location.href = "login.html";
  }
});

// 🔓 Déconnexion
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "login.html";
      } catch (error) {
        console.error("Erreur déconnexion :", error);
        alert("Erreur lors de la déconnexion");
      }
    });
  }
});
