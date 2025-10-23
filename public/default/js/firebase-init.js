// Importations nécessaires pour Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuration Firebase fournie par l'utilisateur
const firebaseConfig = {
  apiKey: "AIzaSyCMsbTpuX_ZhJX3klUmeZ82tSpbfJrx4qA",
  authDomain: "evoke-projet.firebaseapp.com",
  projectId: "evoke-projet",
  storageBucket: "evoke-projet.firebasestorage.app",
  messagingSenderId: "717847102679",
  appId: "1:717847102679:web:1693ffbaf05026d9249c92",
  measurementId: "G-L0BX2HKK65"
};

// Définition de l'ID d'application (utilisé comme clé de chemin dans Firestore)
const APP_ID_KEY = "default-app-id"; // Clé statique pour les chemins Firestore

// 1. Initialisation de l'application
const app = initializeApp(firebaseConfig);

// 2. Initialisation des services Firestore et Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Active les logs de débogage pour Firestore
setLogLevel('debug'); 

// Rendre les instances globales (point critique)
window.app = app;
window.db = db;
window.auth = auth;
window.appId = APP_ID_KEY; // Utilisation de la clé statique

console.log("Firebase Init: App ID =", window.appId);

// 3. Authentification anonyme pour initialiser la session
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        try {
            await signInAnonymously(auth);
            console.log("Authentification Firebase: Session anonyme démarrée.");
        } catch (error) {
            console.error("Erreur critique d'authentification Firebase:", error);
        }
    } else {
        console.log(`Authentification Firebase: Utilisateur ID: ${user.uid} (Prêt).`);
    }
});