// Importe les fonctions de Logique/Firestore nécessaires du fichier utils
import {
    getProfileImagePath,
    markAsRead,
    setupMessageListener,
    sendMessage,
    showChannelCreationModal,
    setupUserListListener,
    getCurrentChatUnsubscribe,
    setCurrentChatTarget,
    sendTypingStatus,
    setupTypingListener,
    setupChannelManagementEvents, // Correction des 3 points
} from './firebase_utils.js';

// Importation de la fonction de rendu de la nouvelle barre et d'initialisation de sa logique
import { renderInputArea, initializeInputEvents, stopAudioRecording } from './message_input.js';

// --- Constantes UI (inchangées) ---
const ADMIN_ROLES = ['admin', 'tech'];
const PRIVATE_CHAT_TYPE = 'user';
const CHANNEL_CHAT_TYPE = 'channel';

// Variable pour gérer le statut d'écriture de l'utilisateur actuel
let typingTimeout = null;
const TYPING_DELAY_MS = 1500; // Délai avant de passer de 'typing: true' à 'typing: false'

// --- Rendu de l'Interface (Modifié pour le positionnement du bouton) ---

export function generateChatInterface() {
    return {
        left: `
            <div id="chat-menu-header">
                <h2>Contacts & Canaux</h2>
            </div>
            
            <div class="chat-menu-section expanded" id="channels-section">
                <h3 class="section-header" data-target="channels-list">
                    Canaux
                    <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M208,96H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,208,96Z"></path></svg>
                </h3>
                <div id="channels-list" class="section-content">
                    <div class="chat-item placeholder">Chargement des canaux...</div>
                </div>
            </div>

            <div id="channel-creation-area">
            </div>

            <div class="chat-menu-section expanded" id="private-chats-section">
                <h3 class="section-header" data-target="private-chats-list">
                    Chats Privés
                    <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M208,96H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,208,96Z"></path></svg>
                </h3>
                <div id="private-chats-list" class="section-content">
                    <div class="chat-item placeholder">Chargement des utilisateurs...</div>
                </div>
            </div>

            `,
        right: `
            <div id="chat-detail-container" class="chat-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM68,108a12,12,0,1,1,12,12A12,12,0,0,1,68,108Zm60,0a12,12,0,1,1,12,12A12,12,0,0,1,128,108Zm60,0a12,12,0,1,1,12,12A12,12,0,0,1,188,108Zm-35.34,68.66a8,8,0,0,1-11.32,0,32,32,0,0,0-45.34,0,8,8,0,0,1-11.32-11.32,48,48,0,0,1,68,0A8,8,0,0,1,152.66,176.66Z"></path></svg>
                <p>Sélectionnez un contact ou un canal pour démarrer la conversation.</p>
            </div>
            
            <div id="image-modal" class="image-modal">
                <div class="image-modal-content">
                    <button id="close-image-modal-btn" class="close-btn" title="Fermer (Échap)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64a8,8,0,0,1-11.31,0L128,120.69,67.31,60a8,8,0,0,1-11.31,11.31L116.69,128,56,188.69a8,8,0,0,1,11.31,11.31L128,139.31l60.69,60.69a8,8,0,0,1,11.31-11.31L139.31,128l60.69-60.69A8,8,0,0,1,200,64Z"></path></svg>
                    </button>
                    <button id="zoom-in-btn" class="zoom-btn" title="Zoomer (+)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM176,128a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z"></path></svg>
                    </button>
                    <button id="zoom-out-btn" class="zoom-btn" title="Dézoomer (-)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM176,128a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,128Z"></path></svg>
                    </button>
                    <img id="modal-image" src="" alt="Image en plein écran">
                </div>
            </div>

            <div id="channel-creation-modal" class="custom-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Créer un Nouveau Canal</h3>
                        <button id="close-channel-modal-btn" class="close-btn" title="Fermer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64a8,8,0,0,1-11.31,0L128,120.69,67.31,60a8,8,0,0,1-11.31,11.31L116.69,128,56,188.69a8,8,0,0,1,11.31,11.31L128,139.31l60.69,60.69a8,8,0,0,1,11.31-11.31L139.31,128l60.69-60.69A8,8,0,0,1,200,64Z"></path></svg>
                        </button>
                    </div>
                    <form id="create-channel-form">
                        <div class="modal-body">
                            <label for="channel-name-input">Nom du Canal :</label>
                            <input type="text" id="channel-name-input" required placeholder="Ex: Support Technique">

                            <label for="channel-color-input">Couleur du Canal :</label>
                            <input type="color" id="channel-color-input" value="#2196F3">

                            <h4>Ajouter des Membres (Cochez)</h4>
                            <div id="member-checkbox-list" class="member-checkbox-list">
                                <p>Chargement des utilisateurs...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="primary-btn">Créer le Canal</button>
                        </div>
                    </form>
                </div>
            </div>
            <div id="channel-management-modal" class="custom-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="management-modal-title">Gérer le Canal</h3>
                        <button id="close-management-modal-btn" class="close-btn" title="Fermer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64a8,8,0,0,1-11.31,0L128,120.69,67.31,60a8,8,0,0,1-11.31,11.31L116.69,128,56,188.69a8,8,0,0,1,11.31,11.31L128,139.31l60.69,60.69a8,8,0,0,1,11.31-11.31L139.31,128l60.69-60.69A8,8,0,0,1,200,64Z"></path></svg>
                        </button>
                    </div>
                    <form id="manage-channel-form">
                        <input type="hidden" id="manage-channel-id">
                        <div class="modal-body">
                            <label for="manage-channel-name-input">Nom du Canal :</label>
                            <input type="text" id="manage-channel-name-input" required>

                            <label for="manage-channel-color-input">Couleur du Canal :</label>
                            <input type="color" id="manage-channel-color-input" value="#2196F3">

                            <h4>Gérer les Membres (Cochez pour inclure)</h4>
                            <div id="manage-member-checkbox-list" class="member-checkbox-list">
                                </div>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="primary-btn">Sauvegarder les Changements</button>
                        </div>
                    </form>
                </div>
            </div>
            `
    };
}

/**
 * Affiche la fenêtre de chat (utilisée pour les chats privés et les canaux)
 */
export function renderChatDetail(target) {
    setCurrentChatTarget(target);
    
    const isChannel = target.type === CHANNEL_CHAT_TYPE;
    const name = isChannel ? target.name : target.username;
    // Utilisation de la couleur du canal si elle existe, sinon image par défaut
    const channelColor = target.color || '#2196F3';
    const imagePath = isChannel ? '/default/images/png/channel.png' : getProfileImagePath(target.username);
    
    document.getElementById('content-right').innerHTML = `
        <div class="chat-detail-wrapper"> 
            <div class="chat-header"> 
                ${isChannel ? `<div class="chat-header-color-square" style="background-color: ${channelColor};"></div>` : `<img src="${imagePath}" alt="${name}" class="chat-header-img">`}
                <div class="chat-info">
                    <h3>${name}</h3>
                    ${isChannel ? `<span>${target.members.length} membres</span>` : 
                        `
                        <div id="user-status-container"> 
                            <span id="recipient-status-${name}" class="status-indicator ${target.isOnline ? 'online' : 'offline'}">
                                ${target.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                            <span id="typing-indicator-${name}" class="typing-indicator"></span>
                        </div>
                        `
                    }
                </div>
                ${isChannel && ADMIN_ROLES.includes(window.currentUser.role.toLowerCase()) ? 
                    // 🛑 Correction des 3 points : setupChannelManagementEvents sera appelé après
                    `<button id="manage-channel-btn" class="icon-btn" title="Gérer le canal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56A8,8,0,1,1,136,64,8,8,0,0,1,128,56Zm0,64a8,8,0,1,1,8,8A8,8,0,0,1,128,120Zm0,64a8,8,0,1,1,8,8A8,8,0,0,1,128,184Z"></path></svg>
                    </button>` : ''}
            </div>
            
            <div id="message-container" class="message-container"> <div class="message placeholder">Chargement des messages...</div>
            </div>
            
            <div id="chat-input-area-wrapper" class="chat-input-area"> ${renderInputArea()} </div>
            
             <div id="recording-bar" class="recording-bar" style="display:none;">
                <button id="cancel-recording-btn" class="cancel-recording-btn" title="Annuler l'enregistrement">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M200,64a8,8,0,0,1-11.31,0L128,120.69,67.31,60a8,8,0,0,1-11.31,11.31L116.69,128,56,188.69a8,8,0,0,1,11.31,11.31L128,139.31l60.69,60.69a8,8,0,0,1,11.31-11.31L139.31,128l60.69-60.69A8,8,0,0,1,200,64Z"></path></svg>
                </button>
                <div class="recording-visual">
                    <div class="recording-dot"></div>
                    <span id="recording-timer">00:00</span>
                    <span class="recording-text">Enregistrement vocal</span>
                </div>
                <button id="send-audio-btn-bar" class="send-audio-btn-bar" title="Envoyer le vocal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M224,32V224a8,8,0,0,1-16,0V176H40a8,8,0,0,1-6.24-13.43L208.52,38.86A8,8,0,0,1,224,32Z"></path></svg>
                </button>
            </div>

        </div>
    `;
    
    // Déclenche l'écouteur de statut d'écriture pour cette cible
    if (!isChannel) {
        setupTypingListener(target.username);
    } else {
        // 🛑 Assure la configuration du bouton de gestion de canal
        setupChannelManagementEvents(target); 
    }

    markAsRead(target);
    setupMessageListener(target);
    setupTypingInputListener(target); 
    initializeInputEvents(target); 
    setupImageModalEvents(); 
    setupChannelCreationModalEvents(); 
    
    setTimeout(scrollToBottom, 0); 
}

/**
 * Crée un élément de liste générique pour un chat ou un canal.
 */
export function createChatItem(id, type, data) {
    const listItem = document.createElement('div');
    listItem.className = 'chat-item';
    listItem.setAttribute('data-id', id);
    listItem.setAttribute('data-type', type);
    
    const isChannel = type === CHANNEL_CHAT_TYPE;
    const name = isChannel ? data.name : data.username;
    
    // Détermine si un point rouge doit être affiché
    const hasUnread = data.unreadCount > 0;
    
    if (isChannel) {
        // Rendu pour un canal : Le background est la couleur du canal
        const channelColor = data.color || '#2196F3'; 
        
        listItem.classList.add('channel-item');
        // 🛑 S'assurer que le background est appliqué à l'élément de liste complet
        listItem.style.backgroundColor = channelColor; 

        // Détermine la couleur du texte (Noir ou Blanc) en fonction du contraste de la couleur de fond
        const isDark = isColorDark(channelColor);
        listItem.style.color = isDark ? 'white' : 'black';
        // Ajuster aussi le style du point non lu
        const dotColor = isDark ? 'white' : '#1A1A1A'; 
        
        listItem.innerHTML = `
            <div class="chat-info channel-info-only">
                <strong>${name}</strong>
            </div>
            ${hasUnread ? `<div class="unread-dot" data-id="${id}" style="background-color: ${dotColor};"></div>` : ''} `;
            
    } else {
        // Rendu pour un chat privé 
        
        const isMyLastMessage = data.lastMessageSender === window.currentUser.username;
        const isRead = data.lastRead;
        const showSeenIndicator = isMyLastMessage && isRead;

        listItem.innerHTML = `
            <img src="${getProfileImagePath(name)}" alt="${name}">
            <div class="chat-info">
                <strong>${name}</strong>
                <span class="status-indicator ${data.isOnline ? 'online' : 'offline'}">
                    ${data.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
            </div>
            ${showSeenIndicator ? `<div class="seen-indicator">Vu</div>` : ''}
            ${hasUnread ? `<div class="unread-dot" data-id="${id}"></div>` : ''} `;
    }
    
    listItem.addEventListener('click', () => {
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('selected'));
        listItem.classList.add('selected');
        
        // Annule l'abonnement précédent et démarre le nouveau
        const unsubscribeFn = getCurrentChatUnsubscribe();
        if (unsubscribeFn) {
            unsubscribeFn();
        }
        
        renderChatDetail({...data, type: type}); 
    });

    return listItem;
}

/**
 * Détermine si une couleur hexadécimale est sombre (pour choisir la couleur du texte).
 */
function isColorDark(hexColor) {
    if (!hexColor || hexColor.length < 4) return false;
    
    // Normalisation de la couleur hexadécimale
    let color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
    }

    if (color.length !== 6) return false;

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Calcul de la luminance relative (W3C standard)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b);
    
    // Seuil de 128 pour déterminer si la couleur est sombre (0-255)
    return luminance < 128; 
}


// NOUVEAU: Écouteur pour le statut d'écriture
export function setupTypingInputListener(target) {
    const input = document.getElementById('chat-input-text'); 
    
    if (input && target.type === PRIVATE_CHAT_TYPE) {
        input.addEventListener('input', () => {
            sendTypingStatus(target.username, true);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                sendTypingStatus(target.username, false);
            }, TYPING_DELAY_MS);
        });
    }
}

export function setupChatFormListener() {
    // Cette fonction est désormais gérée par message_input.js
    const form = document.getElementById('chat-form-new');
    const input = document.getElementById('chat-input-text');
    
    if (form && input) {
        form.removeEventListener('submit', sendMessage); 
        form.addEventListener('submit', sendMessage);
    }
}

export function scrollToBottom() {
    const container = document.getElementById('message-container');
    if (container) {
        setTimeout(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }, 100);
    }
}

// Fonction pour demander la permission de notification
export function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log("Permission de notification desktop :", permission);
            });
        }
    }
}

// Durée de la notification ajustée à 3 secondes (3000 ms)
export function showNativeNotification(title, body, senderUsername) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: getProfileImagePath(senderUsername) || '/default/images/png/app_icon_192.png', 
            vibrate: [200, 100, 200],
            requireInteraction: false 
        });
        
        setTimeout(() => {
            notification.close();
        }, 3000);

        playNotificationSound();
    }
}


// Fonction pour jouer le son de notification 
export const playNotificationSound = () => {
    try {
        const audio = new Audio('/default/audio/notif.mp3'); 
        audio.volume = 0.5; 
        audio.play().catch(e => console.warn("Impossible de jouer l'audio de notification (interaction utilisateur requise ?):", e.message));
    } catch (e) {
        console.error("Erreur lors de la création de l'objet Audio de notification:", e);
    }
};

/**
 * Affiche le bouton de création de canal uniquement pour Admin et Tech.
 */
export function renderChannelCreationButton() {
    const creationArea = document.getElementById('channel-creation-area');
    const userRole = window.currentUser ? window.currentUser.role : null; 

    if (!creationArea) return;
    
    if (userRole && ADMIN_ROLES.includes(userRole.toLowerCase())) { 
        // SVG + Texte
        creationArea.innerHTML = `
            <button id="add-channel-btn" class="add-channel-btn" title="Créer un nouveau canal">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
                Ajouter un canal
            </button>
        `;
        
        document.getElementById('add-channel-btn').addEventListener('click', () => {
            showChannelCreationModal();
        });
    } else {
        creationArea.innerHTML = '';
    }
}

/**
 * Fonction pour stopper les écouteurs Firestore et les événements actifs.
 */
export function stopMessagingEvents() {
    const unsubscribeFn = getCurrentChatUnsubscribe();
    if (unsubscribeFn) {
        unsubscribeFn();
    }
    stopAudioRecording();
}


/**
 * Initialise tous les événements de messagerie au chargement de la vue.
 */
export function initializeMessagingEvents() {
    requestNotificationPermission(); 
    setupUserListListener(); 
    renderChannelCreationButton();
    
    const unsubscribeFn = getCurrentChatUnsubscribe();
    if (unsubscribeFn) {
        unsubscribeFn();
    }
    
    setCurrentChatTarget(null);
    setupChannelCreationModalEvents(); 
    setupSectionToggleEvents(); 
}

/**
 * Configure les événements de bascule pour les sections de liste (Canaux/Chats Privés).
 */
function setupSectionToggleEvents() {
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            const content = document.getElementById(header.getAttribute('data-target'));
            
            // Si le contenu est visible (max-height non nulle ou classe 'expanded')
            if (section.classList.contains('expanded')) {
                // Cacher
                content.style.maxHeight = '0';
                section.classList.remove('expanded');
            } else {
                // Afficher
                // Réajuste le scrollHeight car il pourrait changer
                content.style.maxHeight = content.scrollHeight + 'px';
                section.classList.add('expanded');
            }
        });
    });
}


// ------------------------------------------------------------------
// FONCTIONS D'AFFICHAGE ET DE ZOOM D'IMAGE EN PLEIN ÉCRAN (Inchangé)
// ------------------------------------------------------------------

let currentScale = 1.0;
const ZOOM_STEP = 0.2;

/**
 * Ouvre le modal et affiche l'image.
 * @param {string} src URL de l'image.
 */
export function openImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-image');
    if (modal && img) {
        img.src = src;
        modal.style.display = 'flex';
        currentScale = 1.0;
        img.style.transform = `scale(${currentScale})`;
    }
}

/**
 * Ferme le modal.
 */
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
        currentScale = 1.0;
    }
}

/**
 * Gère le zoom.
 * @param {boolean} zoomIn True pour zoomer, False pour dézoomer.
 */
function handleZoom(zoomIn) {
    const img = document.getElementById('modal-image');
    if (img) {
        if (zoomIn) {
            currentScale += ZOOM_STEP;
        } else {
            currentScale = Math.max(1.0, currentScale - ZOOM_STEP); // Zoom minimum à 1.0
        }
        img.style.transform = `scale(${currentScale})`;
    }
}

/**
 * Configure les écouteurs d'événements pour le modal d'image.
 */
function setupImageModalEvents() {
    const closeBtn = document.getElementById('close-image-modal-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const modal = document.getElementById('image-modal');

    if (closeBtn) closeBtn.onclick = closeImageModal;
    if (zoomInBtn) zoomInBtn.onclick = () => handleZoom(true);
    if (zoomOutBtn) zoomOutBtn.onclick = () => handleZoom(false);

    // Fermeture en cliquant sur l'arrière-plan du modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'image-modal') {
                closeImageModal();
            }
        });
    }
    
    // Fermeture avec la touche Échap
    document.removeEventListener('keydown', handleEscapeKey); // Nettoie les anciens écouteurs
    document.addEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('image-modal') && document.getElementById('image-modal').style.display === 'flex') {
            closeImageModal();
        }
        if (document.getElementById('channel-creation-modal') && document.getElementById('channel-creation-modal').style.display === 'flex') {
            closeChannelCreationModal();
        }
    }
}

// ------------------------------------------------------------------
// FONCTIONS DE GESTION DES MODALES INTERNES (CRÉATION DE CANAL) (Inchangé)
// ------------------------------------------------------------------

/**
 * Configure les événements pour la modale de création de canal.
 */
function setupChannelCreationModalEvents() {
    const modal = document.getElementById('channel-creation-modal');
    const closeBtn = document.getElementById('close-channel-modal-btn');
    const form = document.getElementById('create-channel-form');

    if (closeBtn) closeBtn.onclick = closeChannelCreationModal;
    
    if (modal) {
        // Fermeture en cliquant sur l'arrière-plan du modal
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'channel-creation-modal') {
                closeChannelCreationModal();
            }
        });
    }
    
    // Le formulaire est géré dans firebase_utils.js via 'showChannelCreationModal'
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            // La logique de création est dans firebase_utils
            // Nous allons simplement appeler la fonction de création ici (elle sera mise à jour pour lire les inputs)
            const name = document.getElementById('channel-name-input').value.trim();
            const color = document.getElementById('channel-color-input').value;
            const selectedMembers = Array.from(document.querySelectorAll('#member-checkbox-list input:checked'))
                                         .map(checkbox => checkbox.value);
            
            if (name) {
                // Appel à la fonction mise à jour dans firebase_utils
                showChannelCreationModal(name, color, selectedMembers); 
                closeChannelCreationModal();
            }
        };
    }
}

/**
 * Ferme le modal de création.
 */
export function closeChannelCreationModal() {
    const modal = document.getElementById('channel-creation-modal');
    const form = document.getElementById('create-channel-form');
    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset(); // Réinitialiser le formulaire
    }
}

/**
 * Affiche le modal de gestion de canal (pour Admin/Tech)
 */
export function openChannelManagementModal(channelData) {
    const modal = document.getElementById('channel-management-modal');
    const form = document.getElementById('manage-channel-form');
    const closeBtn = document.getElementById('close-management-modal-btn');
    
    if (!modal || !form) return;

    // Remplissage des données actuelles
    document.getElementById('manage-channel-id').value = channelData.id;
    document.getElementById('manage-channel-name-input').value = channelData.name;
    document.getElementById('manage-channel-color-input').value = channelData.color || '#2196F3';
    document.getElementById('management-modal-title').textContent = `Gérer: ${channelData.name}`;

    // On ferme si on clique sur la croix ou l'arrière-plan
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'channel-management-modal') {
            modal.style.display = 'none'; // Changement de 'flex' à 'none' pour la fermeture
        }
    });

    // On affiche d'abord la modale
    modal.style.display = 'flex';
}

export function populateUserCheckboxes(users, targetContainerId, currentMembers = []) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    container.innerHTML = '';
    
    users.forEach(user => {
        const isChecked = currentMembers.includes(user.username);
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'member-checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="${targetContainerId}-${user.username}" value="${user.username}" ${isChecked ? 'checked' : ''} ${user.username === window.currentUser.username ? 'disabled' : ''}>
            <label for="${targetContainerId}-${user.username}">
                <img src="${getProfileImagePath(user.username)}" alt="${user.username}">
                ${user.username} ${user.username === window.currentUser.username ? '(Vous)' : ''}
            </label>
        `;
        container.appendChild(checkboxItem);
    });
}