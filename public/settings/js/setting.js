// --- /settings/js/setting.js ---

// Nouveaux constantes pour les notifications et les sons
const NOTIFICATION_POINTS = [
    { key: 'preShift', label: 'Rappel Avant DÉBUT SHIFT' },
    { key: 'prePause', label: 'Rappel Avant DÉBUT PAUSE' },
    { key: 'postPause', label: 'Alerte PAUSE Dépassée' },
    { key: 'preEndShift', label: 'Rappel Avant FIN SHIFT' }
];

// MODIFICATION: Renommage des fichiers audio en 1.mp3, 2.mp3, etc.
const AUDIO_FILES = [
    { key: '1.mp3', name: 'Notification 1' },
    { key: '2.mp3', name: 'Notification 2' },
    { key: '3.mp3', name: 'Notification 3' },
    { key: '4.mp3', name: 'Notification 4' },
    { key: '5.mp3', name: 'Notification 5' }
];

// La liste des menus est mise à jour avec les contenus
const SETTINGS_SUBMENUS = [
    { key: 'notification', title: 'Notifications', content: 'Gérez vos préférences de notifications.' },
    { key: 'authorization', title: 'Autorisations', content: 'Gérez les accès et les rôles utilisateur.' },
    { key: 'preference', title: 'Préférences', content: 'Options générales de l\'interface.' },
    { key: 'theme', title: 'Thème', content: 'Personnalisez l\'apparence de l\'application.' }
];

// Liste étendue de couleurs (inchangée)
const CUSTOM_COLORS = [
    { name: 'Bleu Royal', value: '#1a73e8' },
    { name: 'Cyan Céleste', value: '#17a2b8' },
    { name: 'Vert Émeraude', value: '#16a085' },
    { name: 'Rouge Carmin', value: '#e74c3c' },
    { name: 'Orange Vif', value: '#e67e22' },
    { name: 'Violet Profond', value: '#9b59b6' },
    { name: 'Rose Fushia', value: '#ff69b4' },
    { name: 'Jaune Or', value: '#f1c40f' },
    { name: 'Indigo', value: '#4b0082' },
    { name: 'Marron Chocolat', value: '#d2691e' },
    { name: 'Gris Ardoise', value: '#607d8b' },
    { name: 'Olive Sombre', value: '#556b2f' },
    { name: 'Turquoise', value: '#40e0d0' },
    { name: 'Corail', value: '#ff7f50' },
    { name: 'Lime Vert', value: '#00ff00' }
];

// Fonction utilitaire pour lire les préférences notif de l'utilisateur
function getUserNotifPrefs() {
    const defaultPrefs = {
        enabled: true,
        audioEnabled: true,
        audioFile: '1.mp3', // Son par défaut pour les rappels de shift/pause (mis à jour)
        messageNotifEnabled: true, // NOUVEAU: Activation/Désactivation des notifications de messages (interne)
        messageAudioFile: '2.mp3', // NOUVEAU: Son par défaut pour les messages (mis à jour)
        preShift: 5,
        prePause: 5,
        postPause: 1, 
        preEndShift: 5
    };
    const savedPrefs = JSON.parse(localStorage.getItem('userNotifPrefs')) || {};
    return { ...defaultPrefs, ...savedPrefs };
}

// Fonction utilitaire pour sauvegarder les préférences
function saveUserNotifPrefs(prefs) {
    localStorage.setItem('userNotifPrefs', JSON.stringify(prefs));
}

/**
 * Génère le contenu HTML pour le panneau de gauche (liste des sous-menus).
 * @param {string} currentSubView - La sous-vue actuellement active (par défaut: 'notification').
 * @returns {string} HTML pour content-left.
 */
export function generateSettingsMenu(currentSubView = 'notification') {
    let html = '<ul class="settings-menu">';
    SETTINGS_SUBMENUS.forEach(menu => {
        const activeClass = menu.key === currentSubView ? 'active' : '';
        html += `<li class="settings-menu-item ${activeClass}" data-subview="${menu.key}">${menu.title}</li>`;
    });
    html += '</ul>';
    return html;
}

/**
 * Génère le contenu HTML pour le panneau de droite (détails du sous-menu).
 * @param {string} subViewKey - La clé du sous-menu (ex: 'theme').
 * @returns {string} HTML pour content-right.
 */
export function generateSettingsDetail(subViewKey) {
    const subMenu = SETTINGS_SUBMENUS.find(m => m.key === subViewKey) || SETTINGS_SUBMENUS[0];
    let html = `<div class="setting-detail-panel"><h2>${subMenu.title}</h2><p>${subMenu.content}</p>`;
    const prefs = getUserNotifPrefs();
    
    // Récupère l'état réel de la permission du navigateur
    const browserNotifPermission = ("Notification" in window) && Notification.permission === "granted";


    if (subViewKey === 'notification') {
        // --- Panneau de réglage des Durées des Notifications ---
        let timeSettingsHTML = '<div class="notification-section time-settings-section"><h3>Durée des Rappels (en minutes)</h3>';
        
        NOTIFICATION_POINTS.forEach(point => {
            // Afficher le postPause en minutes APRES, les autres en minutes AVANT
            const suffix = (point.key === 'postPause') ? ' (après l\'heure limite)' : ' (avant l\'événement)';
            const minVal = 1; // 1 min minimum pour tous
            const maxVal = 10; // 10 min maximum pour tous
            
            timeSettingsHTML += `
                <div class="setting-item-row time-input-row">
                    <label for="notif-time-${point.key}">${point.label}${suffix} :</label>
                    <div class="input-with-unit">
                        <input type="range" id="notif-time-${point.key}" min="${minVal}" max="${maxVal}" value="${prefs[point.key]}" class="input-notif-range">
                        <span class="range-value-display" data-target="notif-time-${point.key}">${prefs[point.key]}</span>
                        <span class="unit-label">min</span>
                    </div>
                </div>
            `;
        });
        timeSettingsHTML += '</div>';

        // --- Panneau de réglage Audio des Rappels Systèmes ---
        let audioSettingsHTML = '<div class="notification-section audio-settings-section"><h3>Son des Rappels Systèmes (Shift/Pause)</h3>';
        audioSettingsHTML += '<div class="setting-item-row audio-control-row">';
        audioSettingsHTML += '<label for="notif-audio-select">Choix du Son :</label>'; 
        audioSettingsHTML += '<select id="notif-audio-select" data-audio-key="audioFile">'; // Ajout de data-audio-key
        AUDIO_FILES.forEach(audio => {
            const isSelected = audio.key === prefs.audioFile ? 'selected' : '';
            audioSettingsHTML += `<option value="${audio.key}" ${isSelected}>${audio.name}</option>`;
        });
        audioSettingsHTML += '</select>';
        audioSettingsHTML += '<button id="test-system-audio-button" class="action-button" data-audio-key="audioFile">Tester</button>';
        audioSettingsHTML += '</div>'; // setting-item-row
        audioSettingsHTML += '</div>'; // notification-section

        // --- NOUVEAU: Panneau de réglage Audio des Messages ---
        let messageAudioSettingsHTML = '<div class="notification-section message-audio-settings-section"><h3>Son des Nouveaux Messages</h3>';
        messageAudioSettingsHTML += '<div class="setting-item-row audio-control-row">';
        messageAudioSettingsHTML += '<label for="notif-message-audio-select">Choix du Son :</label>'; 
        audioSettingsHTML += '<select id="notif-message-audio-select" data-audio-key="messageAudioFile">'; // Ajout de data-audio-key
        AUDIO_FILES.forEach(audio => {
            const isSelected = audio.key === prefs.messageAudioFile ? 'selected' : '';
            messageAudioSettingsHTML += `<option value="${audio.key}" ${isSelected}>${audio.name}</option>`;
        });
        messageAudioSettingsHTML += '</select>';
        messageAudioSettingsHTML += '<button id="test-message-audio-button" class="action-button" data-audio-key="messageAudioFile">Tester</button>';
        messageAudioSettingsHTML += '</div>'; // setting-item-row
        messageAudioSettingsHTML += '</div>'; // notification-section


        html += timeSettingsHTML + audioSettingsHTML + messageAudioSettingsHTML;

    } else if (subViewKey === 'authorization') {
        // --- Panneau de TOOGLE (Activation/Désactivation) ---
        html += '<div class="authorization-section"><h3>Activation des Fonctionnalités</h3>';

        // Toggle des Notifications Desktop et In-App (Système Général)
        html += `
            <div class="theme-switch-container">
                <span class="theme-switch-label">Activer les **RAPPELS SYSTÈMES** (Shift/Pause/Général)</span>
                <label class="switch">
                    <input type="checkbox" id="toggle-notif-master" ${prefs.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
        
        // Toggle de l'Audio Global
        html += `
            <div class="theme-switch-container">
                <span class="theme-switch-label">Activer le **SON** des rappels SYSTÈMES</span>
                <label class="switch">
                    <input type="checkbox" id="toggle-audio-master" ${prefs.audioEnabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;

        // --- MODIFICATION : Toggle des Notifications de Messages (Desktop et In-App) ---
        // Le statut "coché" reflète la permission du navigateur OU la permission interne
        const messageNotifChecked = browserNotifPermission && prefs.messageNotifEnabled;

        html += `
            <div class="theme-switch-container">
                <span class="theme-switch-label">
                    Activer la **PERMISSION DES NOTIFICATIONS DES MESSAGES** (Navigateur)
                </span>
                <label class="switch">
                    <input type="checkbox" id="toggle-message-permission" ${messageNotifChecked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <p style="font-size: 0.85em; color: var(--text-secondary); margin-top: -10px;">
                Statut actuel du navigateur : 
                <strong style="color: ${browserNotifPermission ? 'var(--green-color)' : 'var(--red-color)'};">
                    ${browserNotifPermission ? 'AUTORISÉ' : (Notification.permission === 'denied' ? 'BLOQUÉ (à changer dans les paramètres du navigateur)' : 'REFUSÉ')}
                </strong>
            </p>
        `;

        html += '</div>';
    
    } else if (subViewKey === 'theme') {
        // Code du Thème (inchangé)
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const isChecked = currentTheme === 'light';

        html += `
            <div class="theme-switch-container">
                <span class="theme-switch-label">Passer au Thème Clair</span>
                <label class="switch">
                    <input type="checkbox" id="theme-toggle" ${isChecked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            
            <hr style="border-color: var(--border-color); margin: 20px 0;">

            <h3>Couleur d'Accentuation Personnalisée (${CUSTOM_COLORS.length} options)</h3>
            <div class="color-palette-container" id="color-palette-container">
                </div>
            <p style="margin-top: 15px; font-size: 0.9em; color: var(--text-secondary);">La couleur personnalisée sera utilisée pour les éléments clés de l'interface.</p>
        `;
    }
    
    html += '</div>';
    return html;
}

// 🚨 NOUVELLE FONCTION: Gère le rechargement du panneau de droite
function refreshSettingsDetail(subViewKey) {
    const contentRight = document.getElementById('content-right');
    contentRight.innerHTML = generateSettingsDetail(subViewKey);
    // On doit ré-attacher les écouteurs après le rechargement
    if (subViewKey === 'authorization') {
        setupAuthorizationControls();
    } else if (subViewKey === 'theme') {
        setupThemeControls(localStorage.getItem('customAccentColor'));
    } else if (subViewKey === 'notification') {
        setupNotificationControls();
    }
}

/**
 * Met en place les écouteurs d'événements spécifiques à la vue 'setting'.
 * @param {string|null} savedColor - La couleur d'accentuation sauvegardée, passée par script.js.
 */
export function initializeSettingsEvents(savedColor = null) {
    const contentLeft = document.getElementById('content-left');
    const contentRight = document.getElementById('content-right');

    // --- Gestion de la Navigation dans les Sous-menus (Clics à gauche) ---
    contentLeft.querySelectorAll('.settings-menu-item').forEach(item => {
        item.removeEventListener('click', handleSubMenuClick); 
        item.addEventListener('click', handleSubMenuClick);
    });

    function handleSubMenuClick(e) {
        const subView = e.currentTarget.getAttribute('data-subview');
        
        // 1. Mise à jour du panneau de droite (Détails) via la nouvelle fonction
        contentRight.innerHTML = generateSettingsDetail(subView);
        
        // 2. Mise à jour de la classe active (Visuel à gauche)
        contentLeft.querySelectorAll('.settings-menu-item').forEach(li => li.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // 3. Réinitialise les événements après rechargement du contenu
        if (subView === 'theme') {
            setupThemeControls(localStorage.getItem('customAccentColor')); 
        } else if (subView === 'notification') {
            setupNotificationControls();
        } else if (subView === 'authorization') {
            setupAuthorizationControls();
        }
    }

    // --- 4. Gestion des Contrôles de Notifications (RANGES, AUDIO SELECTS) ---
    function setupNotificationControls() {
        // Gestion des champs de durée (1 à 10 min)
        document.querySelectorAll('.input-notif-range').forEach(input => {
            const displaySpan = input.parentNode.querySelector('.range-value-display');

            // Événement pour la mise à jour visuelle (pendant le slide)
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (displaySpan) {
                    displaySpan.textContent = value;
                }
            });

            // Événement pour la sauvegarde (quand l'utilisateur relâche le curseur)
            input.addEventListener('change', (e) => {
                const value = parseInt(e.target.value, 10);
                
                const key = e.target.id.replace('notif-time-', '');
                const prefs = getUserNotifPrefs();
                prefs[key] = value;
                saveUserNotifPrefs(prefs);
            });
        });

        // Gestion des choix d'audio (pour les deux sélecteurs)
        document.querySelectorAll('#notif-audio-select, #notif-message-audio-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const prefs = getUserNotifPrefs();
                const key = e.target.getAttribute('data-audio-key');
                prefs[key] = e.target.value;
                saveUserNotifPrefs(prefs);
            });
        });
        
        // Boutons de test audio
        document.querySelectorAll('#test-system-audio-button, #test-message-audio-button').forEach(button => {
             button.addEventListener('click', (e) => {
                const prefs = getUserNotifPrefs();
                const audioKey = e.target.getAttribute('data-audio-key');
                const audioFile = prefs[audioKey]; // Récupère le nom du fichier depuis les prefs
                
                // Assurez-vous que le chemin est correct
                const audio = new Audio(`/checking/audio/${audioFile}`); 
                audio.play().catch(error => console.error(`Erreur lecture audio (${audioFile}):`, error));
            });
        });
    }
    
    // --- 5. Gestion des Contrôles d'Autorisation (Toggles) ---
    function setupAuthorizationControls() {
        const toggleNotifMaster = document.getElementById('toggle-notif-master');
        const toggleAudioMaster = document.getElementById('toggle-audio-master');
        const toggleMessagePermission = document.getElementById('toggle-message-permission'); 
        
        // 1. Toggle Notification Système Générale (Inchangé)
        if (toggleNotifMaster) {
            toggleNotifMaster.addEventListener('change', (e) => {
                const prefs = getUserNotifPrefs();
                prefs.enabled = e.target.checked;
                saveUserNotifPrefs(prefs);
                // Si la notification est désactivée, l'audio l'est aussi
                if (!e.target.checked) {
                    toggleAudioMaster.checked = false;
                    prefs.audioEnabled = false;
                    saveUserNotifPrefs(prefs);
                }
            });
        }
        
        // 2. Toggle Audio Système Générale (Inchangé)
        if (toggleAudioMaster) {
            toggleAudioMaster.addEventListener('change', (e) => {
                const prefs = getUserNotifPrefs();
                prefs.audioEnabled = e.target.checked;
                saveUserNotifPrefs(prefs);
                // Si l'audio est activé, s'assurer que les notifications principales le sont
                if (e.target.checked && !toggleNotifMaster.checked) {
                    toggleNotifMaster.checked = true;
                    prefs.enabled = true;
                    saveUserNotifPrefs(prefs);
                }
            });
        }
        
        // 3. Toggle Permissions de Notifications (Message)
        if (toggleMessagePermission) {
            toggleMessagePermission.addEventListener('change', (e) => {
                const targetChecked = e.target.checked;
                const prefs = getUserNotifPrefs();
                
                if (targetChecked) {
                    // Si l'utilisateur active l'interrupteur, DEMANDER la permission du navigateur
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            // Si la permission est donnée, stocker le statut interne comme true
                            prefs.messageNotifEnabled = true;
                            saveUserNotifPrefs(prefs);
                        } else {
                            // Si la permission est refusée, remettre l'interrupteur à OFF
                            e.target.checked = false;
                            prefs.messageNotifEnabled = false;
                            saveUserNotifPrefs(prefs);
                            alert("La permission de notification du navigateur a été refusée ou bloquée. Veuillez l'activer manuellement dans les paramètres de votre navigateur.");
                        }
                        // 🚨 CORRECTION: Appelle la fonction de rafraîchissement locale
                        refreshSettingsDetail('authorization'); 
                    });
                } else {
                    // L'utilisateur veut désactiver le réglage INTERNE de l'application
                    prefs.messageNotifEnabled = false;
                    saveUserNotifPrefs(prefs);
                }
            });
        }
    }

    // --- 6. Gestion des Contrôles de Thème (Toggle et Palettes) ---
    function setupThemeControls(activeColor) {
        const paletteContainer = document.getElementById('color-palette-container');

        // --- 1. Toggle Dark/Light ---
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'light' : 'dark';
                window.setTheme(newTheme); // Fonction globale définie dans script.js
            });
        }
        
        // --- 2. Palettes de couleurs ---
        if (paletteContainer) {
            
            // Générer le HTML des palettes
            let paletteHTML = '';
            CUSTOM_COLORS.forEach(color => {
                const isActive = color.value === activeColor ? 'active-color' : '';
                paletteHTML += `<span class="color-palette-item ${isActive}" style="background-color: ${color.value};" data-color="${color.value}" title="${color.name}"></span>`;
            });

            // Bouton de réinitialisation
            paletteHTML += `<span class="color-palette-item reset-color" style="background-color: var(--default-accent-color); font-weight: bold; line-height: 34px; text-align: center;" data-color="default" title="Réinitialiser">X</span>`;

            paletteContainer.innerHTML = paletteHTML;

            // Écouteurs pour les clics sur les palettes
            paletteContainer.querySelectorAll('.color-palette-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const color = e.target.getAttribute('data-color');
                    let newColor = color;

                    // Si c'est le bouton "Réinitialiser"
                    if (color === 'default') {
                        localStorage.removeItem('customAccentColor');
                        newColor = getComputedStyle(document.documentElement).getPropertyValue('--default-accent-color').trim() || '#1a73e8'; 
                    } 
                    
                    window.setAccentColor(newColor); // Fonction globale définie dans script.js

                    // Gérer la classe active dans la vue settings
                    paletteContainer.querySelectorAll('.color-palette-item').forEach(li => li.classList.remove('active-color'));
                    if (newColor !== 'default') {
                         paletteContainer.querySelector(`[data-color="${newColor}"]`)?.classList.add('active-color');
                    }
                });
            });
        }
    }
    
    // Initialise les contrôles de la vue actuellement chargée
    const currentSubView = contentLeft.querySelector('.settings-menu-item.active')?.getAttribute('data-subview') || 'notification';
    if (currentSubView === 'theme') {
          setupThemeControls(savedColor);
    } else if (currentSubView === 'notification') {
          setupNotificationControls();
    } else if (currentSubView === 'authorization') {
          setupAuthorizationControls();
    }

}