const VIEW_MODULES = {};

/**
 * Charge dynamiquement les feuilles de style CSS.
 * @param {string|string[]} hrefs - Chemins des fichiers CSS à charger.
 * @param {string} moduleName - Nom du module pour générer un ID unique.
 */
function loadCss(hrefs, moduleName) {
    const paths = Array.isArray(hrefs) ? hrefs : [hrefs];
    
    paths.forEach((path, index) => {
        const id = `${moduleName}-css-${index}`;
        
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = path;
            document.head.appendChild(link);
        }
    });
}

function applySavedTheme() {
    const savedTheme = window.currentUser && window.currentUser.settings ? window.currentUser.settings.theme : null;
    const rootElement = document.documentElement;
    rootElement.setAttribute('data-theme', savedTheme || 'dark');
}

function applySavedAccentColor() {
    const savedColor = window.currentUser && window.currentUser.settings ? window.currentUser.settings.accentColor : null;
    const rootElement = document.documentElement;
    if (savedColor) {
        rootElement.style.setProperty('--accent-color', savedColor);
        rootElement.style.setProperty('--accent-color-custom', savedColor);
    }
}


async function saveUserSettingsToFirestore(userSettings) {
    if (!window.currentUser || !window.db || !window.appId) return;

    try {
        // On importe ici car c'est une fonction utilitaire asynchrone qui n'est pas critique au démarrage
        const { updateDoc, doc, collection } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        
        const dataDocRef = doc(collection(window.db, 'artifacts'), window.appId, 'public', 'data');
        const userRef = doc(collection(dataDocRef, 'users'), window.currentUser.username);

        await updateDoc(userRef, {
            settings: userSettings
        });
        console.log(`✅ Paramètres de ${window.currentUser.username} mis à jour dans Firestore.`);

    } catch(error) {
        console.error("❌ Erreur lors de la mise à jour des paramètres Firebase:", error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.documentElement;
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const contentLeft = document.getElementById('content-left');
    const contentRight = document.getElementById('content-right');
    const headerProfile = document.querySelector('.profile-header');

    // Mettre à jour allNavLinks
    const allNavLinks = [...navItems].filter(item => item !== null);
    const defaultView = 'checking'; // Vue par défaut au démarrage

    
    let currentView = '';

    /**
     * Charge les modules JS (en tant que modules ES) et CSS associés à une vue.
     * @param {string} viewName - Le nom de la vue (e.g., 'messaging').
     * @returns {Promise<Object>} Le module chargé contenant toutes les fonctions exportées.
     */
    async function loadViewModule(viewName) {
        let moduleName, cssPaths = [], jsPaths = [];
        
        if (viewName === 'production') {
            moduleName = 'production';
            jsPaths = [`/projets/js/projet.js`];
            cssPaths = [`/projets/css/projet.css`];
        } else if (viewName === 'setting') {
            moduleName = 'setting';
            jsPaths = [`/settings/js/setting.js`];
            cssPaths = [`/settings/css/setting.css`];
        } 
        // 🛑 CORRECTION CLÉ : Ajout des nouveaux fichiers JS et CSS pour la vue 'messaging'
        else if (viewName === 'messaging') {
            moduleName = 'messaging';
            
            // L'ordre est important pour que les imports JS fonctionnent: firebase_utils.js, chat_ui.js, media_utils.js, message_input.js
            jsPaths = [
                `/messaging/js/firebase_utils.js`,
                `/messaging/js/chat_ui.js`,
                `/messaging/js/media_utils.js`, 
                `/messaging/js/message_input.js`
            ];
            
            // L'ordre est important pour le CSS: chat_ui.css, chat_messages.css, message_input.css
            cssPaths = [
                `/messaging/css/chat_ui.css`,
                `/messaging/css/chat_messages.css`,
                `/messaging/css/message_input.css` // 🆕 Nouveau CSS pour la barre d'input
            ];

        } else if (viewName === 'checking') {
            moduleName = 'checking';
            jsPaths = [
                `/checking/js/checking.js`,
                `/checking/js/check.js`,
                `/checking/js/suivie.js`
            ];
            cssPaths = [
                `/checking/css/check.css`,
                `/checking/css/suivie.css`
            ];
        } else if (viewName === 'logout') {
            moduleName = 'logout';
            jsPaths = [`/default/js/logout.js`]; 
            cssPaths = [`/default/css/logout.css`];
        } else {
            return null;
        }

        if (!VIEW_MODULES[moduleName]) {
            try {
                
                // Le chargement des modules retourne un tableau de tous les exports
                const modules = await Promise.all(jsPaths.map(path => import(path)));
                
                // 🛑 CORRECTION: Aggrège tous les exports dans un seul objet pour la vue
                VIEW_MODULES[moduleName] = modules.reduce((acc, module) => ({ ...acc, ...module }), {});

            } catch (error) {
                VIEW_MODULES[moduleName] = {};
                console.error(`❌ Erreur de chargement du module ${viewName}:`, error);
            }
        }
        
        
        loadCss(cssPaths, moduleName);
        
        return VIEW_MODULES[moduleName];
    }

    /**
     * Génère le contenu HTML de la vue à partir de la fonction de module appropriée.
     * @param {string} viewName - Le nom de la vue.
     * @param {Object} currentUser - L'objet utilisateur actuel.
     * @returns {{left: string, right: string}} L'objet contenant le contenu des panneaux.
     */
    const generateContent = (viewName, currentUser) => {
        
        if (viewName === 'checking' && VIEW_MODULES.checking && VIEW_MODULES.checking.generateCheckingMenu) {
            return {
                left: VIEW_MODULES.checking.generateCheckingMenu(),
                right: VIEW_MODULES.checking.generateCheckingDetail('check', currentUser)
            };
        }
        
        if (viewName === 'setting' && VIEW_MODULES.setting && VIEW_MODULES.setting.generateSettingsMenu) {
             return {
                 left: VIEW_MODULES.setting.generateSettingsMenu(),
                 right: VIEW_MODULES.setting.generateSettingsDetail('notification')
             };
        }
        
        if (viewName === 'production' && VIEW_MODULES.production && VIEW_MODULES.production.generateProjectMenu) {
             return {
                 left: VIEW_MODULES.production.generateProjectMenu(),
                 right: VIEW_MODULES.production.generateProjectDetail('default_project')
             };
        }
        
        if (viewName === 'messaging' && VIEW_MODULES.messaging && VIEW_MODULES.messaging.generateChatInterface) {
             // VIEW_MODULES.messaging est l'aggrégat de chat_ui.js, firebase_utils.js, etc.
             return VIEW_MODULES.messaging.generateChatInterface();
        }

        if (viewName === 'logout' && VIEW_MODULES.logout && VIEW_MODULES.logout.generateLogoutContent) {
            return VIEW_MODULES.logout.generateLogoutContent(currentUser);
        }


        // Contenu par défaut si le module n'a pas pu être chargé ou si la vue n'est pas supportée
        const baseContent = {
            checking: { left: `<h2>Listes des Tâches</h2><p>Tâches en attente.</p>`, right: `<h1>Vérification des Données</h1>` },
            messaging: { left: `<h2>Liste des Chats</h2><p>Veuillez sélectionner un utilisateur.</p>`, right: `<h1>Messaging</h1>` },
            archive: { left: `<h2>Historique</h2><p>Éléments archivés.</p>`, right: `<h1>Archive</h1>` },
            logout: { left: `<h2>Déconnexion</h2><p>Prêt à vous déconnecter.</p>`, right: `<h1>Déconnexion</h1><p>Cliquez sur "Se Déconnecter" pour terminer votre session.</p>` }
        };
        return baseContent[viewName] || baseContent.checking;
    };


    
    window.setTheme = (themeName) => {
        rootElement.setAttribute('data-theme', themeName);
        
        if (window.currentUser) {
            window.currentUser.settings.theme = themeName;
            saveUserSettingsToFirestore(window.currentUser.settings);
        }
    };

    
    window.setAccentColor = (color) => {
        rootElement.style.setProperty('--accent-color', color);
        rootElement.style.setProperty('--accent-color-custom', color);
        
        if (window.currentUser) {
            window.currentUser.settings.accentColor = color;
            saveUserSettingsToFirestore(window.currentUser.settings);
        }
    }
    
    
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
            }
        });
    }


    /**
     * Met à jour le contenu de la page pour la vue spécifiée.
     * @param {string} viewName - Le nom de la vue à charger.
     * @param {boolean} pushState - Indique s'il faut ajouter une entrée à l'historique du navigateur.
     */
    async function updateContent(viewName, pushState = true) {
        
        if (!window.currentUser) {
            return; // Arrête si l'utilisateur n'est pas connecté
        }

        // 🛑 Arrêt des événements de l'ancienne vue avant de passer à la nouvelle
        if (currentView === 'checking' && VIEW_MODULES.checking && VIEW_MODULES.checking.stopCheckingEvents) {
            
            VIEW_MODULES.checking.stopCheckingEvents();
            console.log(`✅ Événements de ${currentView} arrêtés.`);
        }
        
        // 🆕 Arrêt des événements de messagerie (pour gérer les listeners Firestore)
        if (currentView === 'messaging' && VIEW_MODULES.messaging && VIEW_MODULES.messaging.stopMessagingEvents) {
            
            VIEW_MODULES.messaging.stopMessagingEvents();
            console.log(`✅ Événements de ${currentView} arrêtés.`);
        }
        
        
        // Chargement du module (si nécessaire)
        // La condition est maintenue pour ne charger que les vues de contenu
        if (['setting', 'production', 'messaging', 'checking', 'logout', 'archive'].includes(viewName)) {
            await loadViewModule(viewName);
        }


        // Mise à jour de la navigation active
        allNavLinks.forEach(item => item.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Génération et injection du contenu
        const content = generateContent(viewName, window.currentUser);
        contentLeft.innerHTML = content.left;
        contentRight.innerHTML = content.right;
        
        
        // 💡 Initialisation des événements de la nouvelle vue
        if (viewName === 'setting' && VIEW_MODULES.setting && VIEW_MODULES.setting.initializeSettingsEvents) {
             VIEW_MODULES.setting.initializeSettingsEvents();
        }
        else if (viewName === 'production' && VIEW_MODULES.production && VIEW_MODULES.production.initializeProjectEvents) {
             VIEW_MODULES.production.initializeProjectEvents();
        }
        // 🛑 CORRECTION CLÉ : Lancement de l'initialisation de la messagerie
        else if (viewName === 'messaging' && VIEW_MODULES.messaging && VIEW_MODULES.messaging.initializeMessagingEvents) {
             // initializeMessagingEvents n'a besoin que d'être appelée
             VIEW_MODULES.messaging.initializeMessagingEvents();
        }
        else if (viewName === 'checking' && VIEW_MODULES.checking && VIEW_MODULES.checking.initializeCheckingEvents) {
             VIEW_MODULES.checking.initializeCheckingEvents();
        }
        else if (viewName === 'logout' && VIEW_MODULES.logout && VIEW_MODULES.logout.initializeLogoutEvents) {
            VIEW_MODULES.logout.initializeLogoutEvents();
        }

        
        currentView = viewName;

        if (pushState) {
            history.pushState({ view: viewName }, viewName, `#${viewName}`);
        }
    }

    // Événements de clic de la barre latérale
    allNavLinks.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.currentUser) {
                const viewName = item.getAttribute('data-view');
                updateContent(viewName);
            }
        });
    });

    // Événement de navigation (boutons précédent/suivant du navigateur)
    window.addEventListener('popstate', (e) => {
        if (window.currentUser) {
            const hash = window.location.hash.slice(1);
            const viewName = hash || defaultView;
            updateContent(viewName, false);
        }
    });

    
    // Événement déclenché après la connexion de l'utilisateur
    document.addEventListener('userLoggedIn', (e) => {
        
        applySavedTheme();
        applySavedAccentColor();

        const initialHash = window.location.hash.slice(1);
        updateContent(initialHash || defaultView, false);
    });

    // Événement de clic sur le profil (en-tête) pour la déconnexion
    if (headerProfile) {
        headerProfile.addEventListener('click', () => {
            if (window.currentUser) {
                updateContent('logout'); 
            }
        });
    }
});