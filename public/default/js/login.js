const USERS = [
    { 
        username: 'Andry', 
        pass: 'A@e931', // 6 caractères, terminé par des chiffres
        role: 'admin', 
        settings: { 
            theme: 'dark', 
            accentColor: '#1a73e8' 
        } 
    },
    { 
        username: 'Tech', 
        pass: 'T@e427', // 6 caractères, terminé par des chiffres
        role: 'tech', 
        settings: { 
            theme: 'dark', 
            accentColor: '#00bcd4' 
        } 
    },
    { 
        username: 'Lionel', 
        pass: 'L@e723', // 6 caractères, terminé par des chiffres
        role: 'Admin', 
        settings: { 
            theme: 'dark', 
            accentColor: '#4CAF50' 
        }
    },
    { 
        username: 'Miarintsoa', 
        pass: 'M@e459', // 6 caractères, terminé par des chiffres
        role: 'collaborateur', 
        settings: { 
            theme: 'dark', 
            accentColor: '#ff9800'
        } 
    },
    { 
        username: 'Haririah', 
        pass: 'H@e190', // 6 caractères, terminé par des chiffres
        role: 'collaborateur', 
        settings: { 
            theme: 'dark', 
            accentColor: '#9c27b0' 
        } 
    },
    { 
        username: 'Nomena', 
        pass: 'N@e812', // 6 caractères, terminé par des chiffres
        role: 'collaborateur', 
        settings: { 
            theme: 'dark', 
            accentColor: '#2196F3'
        } 
    },
    { 
        username: 'Elinah', 
        pass: 'E@e691', // 6 caractères, terminé par des chiffres
        role: 'collaborateur', 
        settings: { 
            theme: 'dark', 
            accentColor: '#2526F3'
        } 
    },
    { 
        username: 'Isaia', 
        pass: 'I@e556', // 6 caractères, terminé par des chiffres
        role: 'collaborateur', 
        settings: { 
            theme: 'dark', 
            accentColor: '#E91E63'
        } 
    }
].reduce((acc, user) => {
    acc[user.username] = user;
    return acc;
}, {});

// Variables globales
window.currentUser = null; 
const defaultView = 'checking';

const defaultImagePath = '/default/images/png/profil_header.png'; 
const imageBaseDir = '/default/images/jpg/'; 

// Chemins des images Show/Hide
const hideImagePath = '/default/images/png/hide.png';
const showImagePath = '/default/images/png/show.png';

// --- NOUVELLE FONCTION : Jouer un fichier audio ---
const playAudio = (path) => {
    try {
        const audio = new Audio(path);
        audio.volume = 0.5; // Ajustez le volume si nécessaire
        audio.play().catch(e => {
            console.warn(`Impossible de jouer l'audio à : ${path}. Erreur:`, e.message);
            // Souvent causé par les restrictions d'autoplay des navigateurs
        });
    } catch (e) {
        console.error("Erreur lors de la création de l'objet Audio:", e);
    }
};


// Fonction utilitaire pour obtenir le chemin de l'image
const getProfileImagePath = (username) => {
    const filename = username.toLowerCase() + '.jpg';
    return imageBaseDir + filename;
};

// --- Fonction interne pour gérer la connexion/restauration ---
const handleSuccessfulLogin = async (user, isReactivation = false) => {
    const loginOverlay = document.getElementById('login-overlay');

    // Mettre à jour l'objet global
    user.imagePath = getProfileImagePath(user.username);
    window.currentUser = user;

    // JOUER L'AUDIO DE SUCCÈS
    if (!isReactivation) {
        playAudio('default/audio/successful.mp3');
    }

    // 🔑 ÉTAPE CLÉ 1 : Persister l'utilisateur dans localStorage (sans le mot de passe)
    const userToStore = {
        username: user.username,
        role: user.role,
        settings: user.settings,
        imagePath: user.imagePath
    };
    localStorage.setItem('currentUser', JSON.stringify(userToStore));


    // Mise à jour de l'UI (sidebar/header)
    // document.getElementById('sidebar-display-name').textContent = user.username; // Supprimé
    document.getElementById('profil-header-img').src = user.imagePath;
    // document.getElementById('profil-sidebar-img').src = user.imagePath; // Supprimé
    
    // Application des paramètres de l'utilisateur
    document.documentElement.setAttribute('data-theme', user.settings.theme);
    document.documentElement.style.setProperty('--accent-color', user.settings.accentColor);
    document.documentElement.style.setProperty('--accent-color-custom', user.settings.accentColor);
    
    // GESTION FIREBASE : Mettre à jour le statut en ligne (isOnline: true)
    if (window.db && window.appId) {
        try {
            const { setDoc, doc, collection } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            const dataDocRef = doc(collection(window.db, 'artifacts'), window.appId, 'public', 'data');
            const userRef = doc(collection(dataDocRef, 'users'), user.username);

            await setDoc(userRef, {
                username: user.username,
                role: user.role,
                isOnline: true, 
                lastActive: new Date().toISOString(),
                settings: user.settings 
            }, { merge: true });
            
            console.log(`✅ Statut de ${user.username} mis à jour dans Firestore.`);

        } catch(error) {
            console.error("❌ Erreur critique lors de la mise à jour du statut en ligne. L'erreur est :", error);
            if (!isReactivation) {
                const loginMessage = document.getElementById('login-message');
                if (loginMessage) {
                    loginMessage.textContent = "Connexion réussie mais échec de la synchronisation Firebase. Vérifiez la console.";
                    loginMessage.style.color = 'orange';
                }
            }
        }
    }
    
    // 🔑 ÉTAPE CLÉ 3 : Nettoyer l'URL immédiatement après la connexion/restauration
    // Si l'URL contient des paramètres de requête (la partie après le '?'), nous les supprimons.
    const url = new URL(window.location.href);
    const hash = url.hash || `#${defaultView}`; // Conserver le hash (ex: #checking)
    
    // Si des paramètres de requête existent, nous les retirons de l'URL.
    if (url.search) {
        history.replaceState(null, '', url.origin + url.pathname + hash);
        console.log("URL nettoyée des paramètres sensibles.");
    } else if (isReactivation && !url.hash) {
        // Restaurer la vue par défaut si l'URL est vierge après restauration.
        history.replaceState({ view: defaultView }, defaultView, `#${defaultView}`);
    }


    if (loginOverlay && !isReactivation) {
        // En cas de connexion par formulaire, masquer l'overlay après un délai
        setTimeout(() => {
            loginOverlay.classList.remove('active');
            // Déclencher l'événement pour charger le contenu de la SPA
            document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: user } }));
        }, 500);
    } else if (isReactivation) {
        // En cas de réactivation, masquer immédiatement l'overlay si l'utilisateur existe
             if (loginOverlay) {
                 loginOverlay.classList.remove('active');
             }
             // Déclencher l'événement pour charger le contenu de la SPA
             document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: user } }));
    }
};

// --- Fonction de restauration de session ---
const restoreSession = () => {
    // 🔑 ÉTAPE CLÉ 4 : Vérifier s'il y a des identifiants dans l'URL pour une tentative de connexion auto
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');
    
    if (urlUsername && urlPassword) {
        // Si les identifiants sont dans l'URL, on simule une connexion
        const user = USERS[urlUsername];
        if (user && user.pass === urlPassword) {
            console.warn("Connexion initiée depuis les paramètres d'URL (SECURITY RISK).");
            handleSuccessfulLogin(user, false); // Traitement comme une nouvelle connexion
            return;
        }
    }
    
    const storedUser = localStorage.getItem('currentUser');
    const loginOverlay = document.getElementById('login-overlay');

    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (USERS[user.username]) {
                console.log(`Session restaurée pour ${user.username}.`);
                const fullUser = { ...USERS[user.username], ...user };
                handleSuccessfulLogin(fullUser, true); 
                return;
            }
        } catch (e) {
            console.error("Erreur de parsing de la session locale:", e);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Si aucune session n'est trouvée ou restaurée, afficher l'overlay de connexion
    if (loginOverlay) {
        loginOverlay.classList.add('active');
    }
};


// Fonction de déconnexion (Globale)
window.logout = async () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginMessage = document.getElementById('login-message'); // 👈 Récupération de l'élément

    // Mettre à jour le statut de l'utilisateur dans Firestore (déconnexion)
    if (window.currentUser && window.db && window.appId) {
        try {
            const { updateDoc, doc, collection } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            const dataDocRef = doc(collection(window.db, 'artifacts'), window.appId, 'public', 'data');
            const userRef = doc(collection(dataDocRef, 'users'), window.currentUser.username);
            
            await updateDoc(userRef, { 
                isOnline: false, 
                lastActive: new Date().toISOString()
            });
            console.log(`Statut de ${window.currentUser.username} déconnecté dans Firestore.`);
        } catch(err) {
            console.error("Erreur déconnexion statut Firestore:", err);
        }
    }

    window.currentUser = null;
    localStorage.removeItem('currentUser'); 
    localStorage.removeItem('theme'); 
    localStorage.removeItem('customAccentColor');
    
    // Mise à jour de l'UI (éléments de la sidebar/header)
    // document.getElementById('sidebar-display-name').textContent = 'Invité'; // Supprimé
    document.getElementById('profil-header-img').src = defaultImagePath;
    // document.getElementById('profil-sidebar-img').src = defaultImagePath; // Supprimé

    document.documentElement.setAttribute('data-theme', 'dark'); 
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--accent-color-custom');

    // 🔑 CORRECTION : Effacer le message de connexion après déconnexion
    if (loginMessage) {
        loginMessage.textContent = '';
        loginMessage.style.color = ''; // Optionnel: Réinitialiser la couleur si elle était en vert
    }
    // FIN CORRECTION

    if (loginOverlay) {
        loginOverlay.classList.add('active'); 
    }
    history.pushState(null, '', '/'); 
};


// --- Événement Principal DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const passwordInput = document.getElementById('password'); 
    const togglePassword = document.getElementById('toggle-password'); 
    const usernameInput = document.getElementById('username');
    
    // 🔑 Tenter de restaurer la session au chargement (inclut la vérification des paramètres d'URL)
    restoreSession();
    
    // 1. Logique de bascule de visibilité du mot de passe
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Mise à jour de l'attribut src de l'image
            if (type === 'text') {
                togglePassword.src = showImagePath;
                togglePassword.alt = 'Masquer le mot de passe';
            } else {
                togglePassword.src = hideImagePath;
                togglePassword.alt = 'Afficher le mot de passe';
            }
        });
    }


    // 2. Fonction de Connexion (soumission du formulaire)
    if (loginForm && passwordInput && usernameInput) {
        loginForm.addEventListener('submit', async (e) => { 
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const passwordInputValue = passwordInput.value;
            
            if (loginMessage) { loginMessage.textContent = ''; }
            
            const user = USERS[username];

            if (user && user.pass === passwordInputValue) {
                
                if (loginMessage) {
                    loginMessage.textContent = 'validé';
                    loginMessage.style.color = 'green';
                }
                
                // Appel à la fonction centralisée de gestion de connexion
                handleSuccessfulLogin(user, false);
                
            } else {
                // JOUER L'AUDIO D'ÉCHEC
                playAudio('default/audio/failed.mp3');
                
                if (loginMessage) {
                    loginMessage.textContent = 'refusé';
                    loginMessage.style.color = 'red';
                }
            }
        });
    }
});