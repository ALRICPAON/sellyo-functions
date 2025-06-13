import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "./firebase-init.js";

const storage = getStorage(app);
const auth = getAuth(app);

// ✅ Upload réel d’image de couverture
export async function uploadCoverImage(file, tunnelName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  try {
    const path = `tunnels/${user.uid}/${tunnelName}/cover.jpg`;
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type || "image/jpeg",
    };

    console.log("📤 Envoi de l'image vers :", storageRef.fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`📈 Progression upload image : ${progress.toFixed(0)}%`);
        },
        (error) => {
          console.error("❌ Erreur upload image :", error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("✅ URL de l'image :", url);
          resolve(url);
        }
      );
    });
  } catch (e) {
    console.error("⚠️ Fallback image : erreur durant l'upload", e);
    return "https://via.placeholder.com/600x400?text=Image+error";
  }
}

// ✅ Upload réel de vidéo personnalisée
export async function uploadCustomVideo(file, tunnelName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  try {
    const path = `tunnels/${user.uid}/${tunnelName}/video.mp4`;
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type || "video/mp4",
    };

    console.log("📤 Envoi de la vidéo vers :", storageRef.fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`📈 Progression upload vidéo : ${progress.toFixed(0)}%`);
        },
        (error) => {
          console.error("❌ Erreur upload vidéo :", error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("✅ URL de la vidéo :", url);
          resolve(url);
        }
      );
    });
  } catch (e) {
    console.error("⚠️ Fallback vidéo : erreur durant l'upload", e);
    return "https://via.placeholder.com/600x400?text=Vidéo+error";
  }
}
