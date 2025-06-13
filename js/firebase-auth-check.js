import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuration Firebase (✅ BUCKET CORRIGÉ ICI)
const firebaseConfig = {
  apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
  authDomain: "sellyo-3bbdb.firebaseapp.com",
  projectId: "sellyo-3bbdb",
  storageBucket: "sellyo-3bbdb.firebasestorage.app", // ✅ CORRECT
  messagingSenderId: "465249279278",
  appId: "1:465249279278:web:319844f7477ab47930eebf"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Vérifie si l'utilisateur est connecté
onAuthStateChanged(auth, (user) => {
  if (user) {
    const welcomeText = document.getElementById("welcome");
    if (welcomeText) {
      welcomeText.innerText = `Bienvenue ${user.displayName || user.email} 👋`;
    }
  } else {
    window.location.href = "/login.html";
  }
});

// Déconnexion
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "/login.html";
      } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);
      }
    });
  }
});
