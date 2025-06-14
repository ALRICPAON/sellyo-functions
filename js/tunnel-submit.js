console.log("💡 Script tunnel-submit.js chargé !");
// 🔁 On importe la config Firebase DEV
import { app } from "./firebase-config-dev.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { uploadCoverImage, uploadCustomVideo } from "./upload-media.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Webhook Make pour génération automatique
const makeWebhookURL = "https://hook.eu2.make.com/tepvi5cc9ieje6cp9bmcaq7u6irs58dp";

const createBtn = document.getElementById("create-tunnel");
const formContainer = document.getElementById("create-tunnel-form");
const dashboardContent = document.getElementById("dashboard-content");

if (createBtn && formContainer && dashboardContent) {
  createBtn.addEventListener("click", () => {
    formContainer.style.display = "block";
    dashboardContent.innerHTML = "";
    console.log("🧩 Formulaire affiché");
  });
}

const customDomainCheckbox = document.getElementById("use-custom-domain");
const customDomainField = document.getElementById("custom-domain-field");
if (customDomainCheckbox && customDomainField) {
  customDomainCheckbox.addEventListener("change", () => {
    customDomainField.style.display = customDomainCheckbox.checked ? "block" : "none";
  });
}

const form = document.getElementById("tunnel-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🚀 Soumission du formulaire détectée");

    const user = auth.currentUser;
    if (!user) {
      alert("Utilisateur non connecté");
      console.warn("❌ Utilisateur non connecté");
      return;
    }

    const name = document.getElementById("tunnel-name").value;
    const goal = document.getElementById("tunnel-goal").value;
    const type = document.getElementById("tunnel-type").value;
    const sector = document.getElementById("sector").value;
    const desc = document.getElementById("tunnel-desc").value;
    const cta = document.getElementById("cta-text").value;
    const payment = document.getElementById("payment-url").value;
    const wantsCustomDomain = document.getElementById("use-custom-domain").checked;
    const customDomain = wantsCustomDomain ? document.getElementById("custom-domain").value : null;

    const slug = name.toLowerCase().replaceAll(" ", "-");
    const imageFile = document.getElementById("cover-image").files[0];
    const videoFile = document.getElementById("custom-video").files[0];

    let coverUrl = null;
    let videoUrl = null;

    try {
      if (imageFile) {
        console.log("📸 Upload image en cours...");
        coverUrl = await uploadCoverImage(imageFile, slug);
        console.log("✅ Image uploadée :", coverUrl);
      }
      if (videoFile) {
        console.log("🎥 Upload vidéo en cours...");
        videoUrl = await uploadCustomVideo(videoFile, slug);
        console.log("✅ Vidéo uploadée :", videoUrl);
      }

      const tunnelData = {
        userId: user.uid,
        name,
        goal,
        type,
        sector,
        desc,
        cta,
        payment,
        customDomain,
        coverUrl,
        videoUrl,
        createdAt: new Date()
      };

      console.log("🗂️ Données prêtes à être envoyées :", tunnelData);

      // 🔐 Ajout dans Firestore
      const docRef = await addDoc(collection(db, "tunnels"), tunnelData);
      console.log("✅ Tunnel ajouté dans Firestore, ID :", docRef.id);

      // 🚀 Envoi des données vers Make
      const makeResponse = await fetch(makeWebhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tunnelData,
          email: user.email
        })
      });

      if (makeResponse.ok) {
        console.log("✅ Données envoyées à Make avec succès !");
      } else {
        console.warn("⚠️ Erreur HTTP lors de l'appel Make :", makeResponse.status);
      }

      alert("✅ Tunnel enregistré et génération en cours !");
      form.reset();
      customDomainField.style.display = "none";

    } catch (err) {
      console.error("❌ Erreur lors de la sauvegarde du tunnel :", err);
      alert("❌ Une erreur s'est produite pendant la création du tunnel.");
    }
  });
}
