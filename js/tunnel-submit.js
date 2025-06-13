import { app } from "./firebase-init.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { uploadCoverImage, uploadCustomVideo } from "./upload-media.js";

const auth = getAuth(app);
const db = getFirestore(app);

const createBtn = document.getElementById("create-tunnel");
const formContainer = document.getElementById("create-tunnel-form");
const dashboardContent = document.getElementById("dashboard-content");

if (createBtn && formContainer && dashboardContent) {
  createBtn.addEventListener("click", () => {
    formContainer.style.display = "block";
    dashboardContent.innerHTML = "";
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

    const user = auth.currentUser;
    if (!user) return alert("Utilisateur non connecté");

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
        coverUrl = await uploadCoverImage(imageFile, slug);
      }
      if (videoFile) {
        videoUrl = await uploadCustomVideo(videoFile, slug);
      }

      await addDoc(collection(db, "tunnels"), {
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
      });

      alert("✅ Tunnel enregistré avec succès !");
      form.reset();
      customDomainField.style.display = "none";
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      alert("❌ Erreur lors de la sauvegarde du tunnel.");
    }
  });
}
