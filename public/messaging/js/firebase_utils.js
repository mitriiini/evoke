import { 
    collection, 
    doc, 
    onSnapshot, 
    query, 
    orderBy, 
    addDoc, 
    serverTimestamp, 
    limit,
    getDocs,
    setDoc,
    where,
    updateDoc, 
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importe les fonctions de Rendu nécessaires du fichier UI
import { 
    renderChatDetail, 
    createChatItem, 
    scrollToBottom, 
    showNativeNotification, 
    closeChannelCreationModal, // 🆕 Importation de la fonction de fermeture de la modale
    populateUserCheckboxes, // 🆕 Importation pour afficher les checkboxes
    openChannelManagementModal, // 🆕 Importation pour ouvrir la modale de gestion
} from './chat_ui.js';

// --- Variables d'état INTERNES (inchangées) ---

const ADMIN_ROLES = ['admin', 'tech']; 
const PRIVATE_CHAT_TYPE = 'user';
const CHANNEL_CHAT_TYPE = 'channel';

let currentChatUnsubscribe = null;
let currentChatTarget = null;
let typingUnsubscribe = null; 
let chatListUnsubscribe = null; 

// --- Fonctions d'accès et de mise à jour pour les variables d'état (inchangées) ---

export const getCurrentChatTarget = () => currentChatTarget;
export const setCurrentChatTarget = (target) => { currentChatTarget = target; };

export const getCurrentChatUnsubscribe = () => currentChatUnsubscribe;
export const setCurrentChatUnsubscribe = (unsubscribeFn) => { currentChatUnsubscribe = unsubscribeFn; };

// --- Utilitaires (inchangées) ---

export const getProfileImagePath = (username) => {
    const imageBaseDir = '/default/images/jpg/';
    const filename = username.toLowerCase() + '.jpg';
    // Ajout d'une gestion de fallback si vous n'avez pas une image pour l'utilisateur
    // Ceci est crucial pour la notification desktop qui demande l'icône de l'expéditeur
    return imageBaseDir + filename;
};

export const getPrivateChatId = (user1, user2) => {
    return [user1, user2].sort().join('_');
};

export function waitForInitialization(callback) {
    if (window.db && window.appId && window.currentUser) {
        callback();
    } else {
        setTimeout(() => waitForInitialization(callback), 100);
    }
}

export function formatMessageTimestamp(date) {
    if (!date) return '';

    const now = new Date();
    const messageDate = date;
    const diffTime = now.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const timeString = messageDate.toLocaleTimeString('fr-FR', timeOptions);

    if (diffDays === 0) {
        return timeString;
    } else if (diffDays === 1) {
        return `Hier à ${timeString}`;
    } else {
        const dateOptions = { weekday: 'long', day: '2-digit', month: 'long' };
        let dateString = messageDate.toLocaleDateString('fr-FR', dateOptions);
        dateString = dateString.charAt(0).toUpperCase() + dateString.slice(1);
        dateString = dateString.replace(/(\s\w)/g, (match) => match.toUpperCase());
        return `${dateString.replace(',', '')} à ${timeString}`;
    }
}

// --- Logique de Statut "Est en train d'écrire" (inchangée) ---

export async function sendTypingStatus(recipientUsername, isTyping) {
    if (!window.db || !window.appId || !window.currentUser) return;
    
    const userRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'users'), window.currentUser.username);

    try {
        await updateDoc(userRef, {
            isTyping: isTyping,
            typingTarget: isTyping ? recipientUsername : null 
        }, { merge: true });
    } catch (error) {
        console.warn("Échec de la mise à jour du statut 'typing':", error);
    }
}

export function setupTypingListener(targetUsername) {
    // Annule l'écoute précédente si elle existe
    if (typingUnsubscribe) {
        typingUnsubscribe();
    }

    const recipientRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'users'), targetUsername);
    const typingIndicator = document.getElementById(`typing-indicator-${targetUsername}`);
    
    if (!typingIndicator) return;

    typingUnsubscribe = onSnapshot(recipientRef, (docSnap) => {
        if (!docSnap.exists()) return;

        const recipient = docSnap.data();
        
        // 💡 Vérifie que le destinataire est bien en train d'écrire *pour* l'utilisateur actuel
        const isTyping = recipient.isTyping && recipient.typingTarget === window.currentUser.username;
        const currentTarget = getCurrentChatTarget(); // Utilisé pour éviter les clignotements si l'utilisateur change de chat

        if (isTyping && currentTarget && currentTarget.username === targetUsername) {
            typingIndicator.textContent = 'est en train d\'écrire...';
            typingIndicator.style.display = 'inline-block';
        } else {
            typingIndicator.textContent = '';
            typingIndicator.style.display = 'none';
        }
    }, (error) => {
        console.error("Erreur d'écoute du statut d'écriture:", error);
    });
}


// --- Logique Firestore et Listeners (inchangées) ---

export async function markAsRead(target) {
    if (!window.db || !window.appId || !window.currentUser) return;

    const currentUser = window.currentUser.username;
    const isChannel = target.type === CHANNEL_CHAT_TYPE;
    
    let chatRef;
    let itemId = isChannel ? target.id : target.username; // Clé pour l'attribut data-id

    if (isChannel) {
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels'), target.id);
    } else {
        const chatId = getPrivateChatId(currentUser, target.username);
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'chats'), chatId);
    }
    
    try {
        await updateDoc(chatRef, {
            [`lastRead.${currentUser}`]: serverTimestamp()
        }, { merge: true });
        
        // Supprime le badge de non-lu dans l'UI immédiatement après la lecture réussie
        // 🛑 CORRECTION CLÉ : Utiliser le sélecteur avec l'attribut data-id pour trouver le conteneur du point
        const dotElement = document.querySelector(`.chat-item[data-id="${itemId}"] .unread-dot`);
        if(dotElement) {
            dotElement.remove();
        }
    } catch(error) {
        console.warn("Échec de la mise à jour du statut 'lu':", error);
    }
}


/**
 * Récupère les données consolidées des chats privés et des canaux en une seule fois.
 */
export function setupUserListListener() {
    waitForInitialization(() => {
        // Annule l'écoute précédente si elle existe
        if (chatListUnsubscribe) {
            chatListUnsubscribe();
        }

        const usersCollectionPath = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'users');
        const channelsCollectionPath = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels');

        const userListElement = document.getElementById('private-chats-list');
        const channelsListElement = document.getElementById('channels-list');
        
        // Cartographie pour stocker les données d'utilisateur/chat
        const usersMap = {};
        const chatsMap = {};
        const channelsMap = {};
        
        const qUsers = query(usersCollectionPath, orderBy('username', 'asc'));
        const qChannels = query(channelsCollectionPath, where('members', 'array-contains', window.currentUser.username));

        // 1. Écouteur des utilisateurs (pour le statut en ligne et la liste complète)
        const usersUnsubscribe = onSnapshot(qUsers, (usersSnapshot) => {
            if (!userListElement) return;

            usersSnapshot.forEach((docSnap) => {
                const user = docSnap.data();
                // Assurez-vous d'inclure l'utilisateur actuel dans la map pour la gestion des canaux, mais pas dans la liste des chats privés
                usersMap[user.username] = user; 
            });
            // 💡 On met à jour la liste ici aussi au cas où le statut en ligne change rapidement
            updateChatLists(usersMap, channelsMap, userListElement, channelsListElement);
        });
        
        // 2. Écouteur des chats privés (On utilise les utilisateurs + chats)
        const chatsCollectionPath = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'chats');
        const chatsUnsubscribe = onSnapshot(chatsCollectionPath, (chatsSnapshot) => {
               // Récupère uniquement les chats qui impliquent l'utilisateur actuel
               chatsSnapshot.forEach((docSnap) => {
                   const chatId = docSnap.id;
                   const users = chatId.split('_');
                   if(users.includes(window.currentUser.username)) {
                       chatsMap[chatId] = docSnap.data();
                   }
               });
               
               // Mise à jour de l'UI une fois les métadonnées de chats privés reçues
               updateChatLists(usersMap, channelsMap, userListElement, channelsListElement);
        });
        
        // 3. Écouteur des canaux
        const channelsUnsubscribe = onSnapshot(qChannels, (channelsSnapshot) => {
            if (!channelsListElement) return;
            
            channelsSnapshot.forEach((docSnap) => {
                const channel = docSnap.data();
                channel.id = docSnap.id; 
                channelsMap[channel.id] = channel;
            });
            
            // Une fois les canaux reçus, met à jour l'UI
            updateChatLists(usersMap, channelsMap, userListElement, channelsListElement);
        });


        // Enregistre les fonctions de désabonnement pour les arrêter si besoin
        chatListUnsubscribe = () => {
            usersUnsubscribe();
            channelsUnsubscribe();
            chatsUnsubscribe();
            if (typingUnsubscribe) typingUnsubscribe(); 
        };
        
        // Fonction qui va mettre à jour les listes UI (pour être appelée après chaque snapshot)
        function updateChatLists(users, channels, userListElem, channelListElem) {
            userListElem.innerHTML = '';
            channelListElem.innerHTML = '';

            // --- Mise à jour des CHATS PRIVÉS ---
            // 🛑 CORRECTION CLÉ : Filter l'utilisateur actuel pour la liste des chats privés
            Object.values(users).filter(u => u.username !== window.currentUser.username).forEach(user => {
                const targetUsername = user.username;
                const chatId = getPrivateChatId(window.currentUser.username, targetUsername);
                const chat = chatsMap[chatId] || {};
                
                const lastReadTimestamp = chat.lastRead ? chat.lastRead[window.currentUser.username] : null;
                const lastMessageTimestamp = chat.lastMessageTimestamp;
                const lastMessageSender = chat.lastMessageSender;

                // Calcule le non-lu (point rouge) : Y a-t-il un message plus récent que la dernière lecture ?
                let unreadCount = 0;
                if (lastMessageTimestamp && lastMessageTimestamp.toDate && 
                    (!lastReadTimestamp || (lastReadTimestamp.toDate() < lastMessageTimestamp.toDate()))) {
                    
                    // Si le dernier message est de l'autre utilisateur
                    if(lastMessageSender !== window.currentUser.username) {
                        unreadCount = 1; 
                    }
                }
                
                const listItem = createChatItem(targetUsername, PRIVATE_CHAT_TYPE, {
                    name: targetUsername,
                    isOnline: user.isOnline,
                    username: targetUsername,
                    type: PRIVATE_CHAT_TYPE,
                    unreadCount: unreadCount,
                    // 'lastRead' est true si MOI j'ai lu un message plus récent ou égal au dernier message
                    lastRead: (lastReadTimestamp && lastMessageTimestamp && lastReadTimestamp.toDate() >= lastMessageTimestamp.toDate()), 
                    lastMessageSender: lastMessageSender
                });
                userListElem.appendChild(listItem);
            });
            
            // --- Mise à jour des CANAUX ---
            if (Object.keys(channels).length === 0) {
                 channelListElem.innerHTML = '<div class="chat-item placeholder">Aucun canal disponible.</div>';
            } else {
                Object.values(channels).forEach(channel => {
                    const lastReadTimestamp = channel.lastRead ? channel.lastRead[window.currentUser.username] : null;
                    const lastMessageTimestamp = channel.lastMessageTimestamp;

                    // Calcule le non-lu (point rouge) : Y a-t-il un message plus récent que la dernière lecture ?
                    let unreadCount = 0;
                    if (lastMessageTimestamp && lastMessageTimestamp.toDate && 
                        (!lastReadTimestamp || (lastReadTimestamp.toDate() < lastMessageTimestamp.toDate()))) {
                        
                        unreadCount = 1; // 1 pour le point rouge 
                    }

                    const listItem = createChatItem(channel.id, CHANNEL_CHAT_TYPE, {
                        id: channel.id,
                        name: channel.name,
                        type: CHANNEL_CHAT_TYPE,
                        members: channel.members,
                        unreadCount: unreadCount,
                        color: channel.color, // 🆕 Passage de la couleur
                        imagePath: '/default/images/png/channel.png'
                    });
                    channelListElem.appendChild(listItem);
                });
            }
        }

    }); 
}

/**
 * 🆕 Fonction pour envoyer un message de fichier après un upload Cloudinary.
 */
export async function sendMediaMessage(target, fileUrl, fileType, filePublicId) {
    if (!target || !window.db || !window.appId || !window.currentUser) return;

    const isChannel = target.type === CHANNEL_CHAT_TYPE;
    let chatRef;

    if (isChannel) {
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels'), target.id);
    } else {
        const chatId = getPrivateChatId(window.currentUser.username, target.username);
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'chats'), chatId);
    }

    const messagesCollectionPath = collection(chatRef, 'messages');
    const newTimestamp = serverTimestamp();
    
    // Détermine le texte par défaut
    let defaultText = `[${fileType.toUpperCase()}]`;
    if (fileType === 'raw') defaultText = '[FICHIER ANNEXE]';
    if (fileType === 'audio') defaultText = '[MESSAGE VOCAL]';

    try {
        await addDoc(messagesCollectionPath, {
            text: defaultText, 
            sender: window.currentUser.username,
            timestamp: newTimestamp,
            type: fileType, // 'image', 'video', 'audio', 'raw'
            url: fileUrl,
            publicId: filePublicId || null
        });
        
        await updateDoc(chatRef, {
            lastMessageTimestamp: newTimestamp,
            lastMessageSender: window.currentUser.username,
            [`lastRead.${window.currentUser.username}`]: newTimestamp
        }, { merge: true });

        // S'assurer que le statut 'isTyping' est désactivé après l'envoi de fichier
        if (target.type === PRIVATE_CHAT_TYPE) {
            sendTypingStatus(target.username, false);
        }
        scrollToBottom();

    } catch (error) {
        console.error("Erreur d'envoi du message de média:", error);
        throw error;
    }
}


export function setupMessageListener(target) {
    // Annule l'abonnement précédent
    const unsubscribeFn = getCurrentChatUnsubscribe();
    if (unsubscribeFn) {
        unsubscribeFn();
    }
    
    const isChannel = target.type === CHANNEL_CHAT_TYPE;
    let messagesCollectionPath;
    let currentTargetId = isChannel ? target.id : target.username;

    if (isChannel) {
        messagesCollectionPath = collection(doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels'), target.id), 'messages');
    } else {
        const chatId = getPrivateChatId(window.currentUser.username, target.username);
        messagesCollectionPath = collection(doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'chats'), chatId), 'messages');
    }

    const q = query(messagesCollectionPath, orderBy('timestamp', 'asc'), limit(50));
    const messageContainer = document.getElementById('message-container');
    let isInitialLoad = true;

    const newUnsubscribe = onSnapshot(q, (snapshot) => {
        if (!messageContainer) return;
        
        const changes = snapshot.docChanges();
        const hasNewMessage = changes.some(change => change.type === 'added');
        const lastMessage = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].data() : null;
        const lastMessageSender = lastMessage ? lastMessage.sender : null;

        // 🛑 CORRECTION CLÉ: Logique de notification Desktop et son
        const isUserSender = lastMessageSender === window.currentUser.username;
        const isCurrentChatOpen = currentChatTarget && currentTargetId === (currentChatTarget.id || currentChatTarget.username);
        
        // Utilise document.hidden pour vérifier si l'onglet est en arrière-plan
        const isAppHidden = document.hidden; 

        if (!isInitialLoad && hasNewMessage && !isUserSender) {
            
            // Condition pour déclencher la notification desktop avec son:
            // 1. Si l'application est cachée (onglet en arrière-plan)
            // OU
            // 2. Si l'application est visible, mais le chat n'est pas sélectionné
            const shouldSendNotification = isAppHidden || !isCurrentChatOpen;

            if (shouldSendNotification) {
                let notificationTitle;
                let notificationBody = lastMessage.text;

                if (isChannel) {
                    notificationTitle = `[#${target.name}] Nouveau message de ${lastMessageSender}`;
                } else {
                    notificationTitle = `Nouveau message de ${lastMessageSender}`;
                }
                
                // 💡 Déclenche la notification desktop avec son et l'icône de profil
                showNativeNotification(notificationTitle, notificationBody, lastMessageSender);
            }
            
            // MarkAsRead n'est appelé que si le chat est *ouvert* (isCurrentChatOpen) ET l'app est *visible* (!isAppHidden).
            // Si l'app est en arrière-plan, le message reste non lu dans l'UI des listes (et donc le point rouge s'affiche).
            if (isCurrentChatOpen && !isAppHidden) {
                markAsRead(target); 
            }
        }

        messageContainer.innerHTML = ''; 
        snapshot.forEach((doc) => {
            const message = doc.data();
            const isMe = message.sender === window.currentUser.username;
            
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isMe ? 'sent' : 'received'}`;
            
            let timeString = '';
            let dateObject = null;
            if (message.timestamp && message.timestamp.toDate) {
                dateObject = message.timestamp.toDate();
                timeString = formatMessageTimestamp(dateObject); 
            }

            const senderName = message.sender;
            const profileImgPath = getProfileImagePath(senderName);
            
            const isVisibleSenderInfo = isChannel || !isMe; 

            const pdpHTML = `<img src="${profileImgPath}" alt="${senderName}" class="message-pdp">`;

            const senderInfoHTML = `
                <div class="sender-name-container ${isVisibleSenderInfo ? '' : 'hidden'}">
                    <span class="sender-name-text">${senderName}</span>
                </div>`;
            
            let contentHTML;
            // 🆕 Logique pour afficher les différents types de contenu (texte, image, audio, etc.)
            switch (message.type) {
                case 'image':
                    contentHTML = `<img src="${message.url}" alt="Image envoyée" class="chat-media image">`;
                    break;
                case 'video':
                    // Cloudinary supporte l'embed de vidéo
                    contentHTML = `<video controls src="${message.url}" class="chat-media video"></video>`;
                    break;
                case 'audio':
                    // Cloudinary supporte l'embed audio
                    contentHTML = `<audio controls src="${message.url}" class="chat-media audio"></audio>`;
                    break;
                case 'raw':
                    contentHTML = `<a href="${message.url}" target="_blank" class="chat-media file-link"><i class="ph-file-light"></i> Fichier: ${message.text}</a>`;
                    break;
                case 'text':
                default:
                    contentHTML = `<p>${message.text}</p>`;
                    break;
            }


            const messageContentHTML = `
                <div class="message-content message-type-${message.type || 'text'}">
                    ${contentHTML}
                </div>`;
            
            const timeHTML = `<span class="message-time-outside">${timeString}</span>`;

            const messageBlockHTML = `
                <div class="message-block-wrapper">
                    ${senderInfoHTML}
                    ${messageContentHTML}
                </div>
            `;
            
            if (isMe) {
                 messageElement.innerHTML = `
                    <div class="message-group">
                        ${messageBlockHTML}
                        <div class="pdp-wrapper">${pdpHTML}</div>
                    </div>
                    ${timeHTML}
                `;
            } else {
                 messageElement.innerHTML = `
                    <div class="message-group">
                        <div class="pdp-wrapper">${pdpHTML}</div>
                        ${messageBlockHTML}
                    </div>
                    ${timeHTML}
                `;
            }
            
            messageContainer.appendChild(messageElement);
        });
        
        if (isInitialLoad || hasNewMessage) {
              scrollToBottom();
        }
        isInitialLoad = false;


    }, (error) => {
        console.error("Erreur d'écoute des messages:", error);
        messageContainer.innerHTML = '<div class="message error">Erreur de chargement des messages.</div>';
    });
    
    // Utilise la fonction de setter pour enregistrer la nouvelle fonction de désabonnement
    setCurrentChatUnsubscribe(newUnsubscribe);
}

/**
 * Logique d'envoi du message (pour le TEXTE uniquement)
 */
export async function sendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('chat-input-text'); // 🛑 CHANGEMENT D'ID
    const text = input.value.trim();
    
    // Utilise la fonction de getter pour obtenir la cible
    const currentTarget = getCurrentChatTarget(); 
    
    if (!text || !currentTarget || !window.db || !window.appId || !window.currentUser) return;
    
    const isChannel = currentTarget.type === CHANNEL_CHAT_TYPE;
    let chatRef;

    if (isChannel) {
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels'), currentTarget.id);
    } else {
        const chatId = getPrivateChatId(window.currentUser.username, currentTarget.username);
        chatRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'chats'), chatId);
    }

    const messagesCollectionPath = collection(chatRef, 'messages');
    const newTimestamp = serverTimestamp();
    
    try {
        await addDoc(messagesCollectionPath, {
            text: text,
            sender: window.currentUser.username,
            timestamp: newTimestamp, // Utilise la même valeur pour le message et la métadonnée
            type: 'text' // 🆕 Type de message ajouté
        });
        
        // NOUVEAU: Mettre à jour les métadonnées du chat/canal avec le dernier message
        await updateDoc(chatRef, {
            lastMessageTimestamp: newTimestamp,
            lastMessageSender: window.currentUser.username,
            // Met à jour 'lastRead' de l'expéditeur au moment de l'envoi.
            [`lastRead.${window.currentUser.username}`]: newTimestamp
        }, { merge: true });


        input.value = '';
        scrollToBottom();
        
        // NOUVEAU: S'assurer que le statut 'isTyping' est désactivé après l'envoi
        if (currentTarget.type === PRIVATE_CHAT_TYPE) {
            sendTypingStatus(currentTarget.username, false);
        }

    } catch (error) {
        console.error("Erreur d'envoi du message:", error);
    }
}


// --- Logique de Création et Gestion de Canal (MODIFIÉE) ---

/**
 * 🛑 MODIFIÉE: Cette fonction gère maintenant l'affichage de la modale INTERNE
 * et la récupération des utilisateurs.
 */
export function showChannelCreationModal(channelName, channelColor, selectedMembers) {
    // Si des paramètres sont passés, cela signifie que la soumission du formulaire est complète, on crée le canal
    if (channelName && selectedMembers) {
        createChannel(channelName, channelColor, selectedMembers);
        return;
    }

    waitForInitialization(async () => {
        const modal = document.getElementById('channel-creation-modal');
        if (!modal) return;

        try {
            const usersCollectionPath = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'users');
            const qUsers = query(usersCollectionPath, orderBy('username', 'asc'));
            const snapshot = await getDocs(qUsers);
            const allUsers = snapshot.docs.map(doc => doc.data());
            
            // Affichage des checkboxes pour la sélection
            populateUserCheckboxes(allUsers, 'member-checkbox-list', [window.currentUser.username]); // Pré-coche l'utilisateur actuel
            
            modal.style.display = 'flex'; // Afficher la modale interne
            
        } catch(error) {
            console.error("Erreur lors de la récupération des utilisateurs pour le canal:", error);
            alert("Erreur lors de la préparation de la création du canal. Vérifiez la console.");
        }
    });
}

/**
 * 🛑 MODIFIÉE: Ajout du paramètre color et utilisation de la liste des membres.
 */
async function createChannel(name, color, selectedMembers) {
    const channelRef = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels');
    
    // S'assurer que l'utilisateur actuel est toujours inclus, même s'il est désactivé dans l'UI
    const allMembersSet = new Set([window.currentUser.username, ...selectedMembers]);
    const allMembers = Array.from(allMembersSet);

    try {
        await addDoc(channelRef, {
            name: name,
            createdBy: window.currentUser.username,
            members: allMembers,
            createdAt: serverTimestamp(),
            color: color || '#2196F3', // 🆕 Sauvegarde la couleur
            lastRead: {} 
        });
        alert(`Canal "${name}" créé avec ${allMembers.length} membres !`);
        closeChannelCreationModal();
    } catch(error) {
        console.error("Échec de la création du canal:", error);
        alert("Échec de la création du canal. Vérifiez la console.");
    }
}

/**
 * 🆕 Configure les événements pour le bouton de gestion de canal.
 */
export function setupChannelManagementEvents(target) {
    const manageBtn = document.getElementById('manage-channel-btn');
    if (!manageBtn) return;

    manageBtn.onclick = () => {
        // 1. Ouvre la modale
        openChannelManagementModal(target); 
        
        // 2. Charge les utilisateurs et pré-coche les membres actuels
        loadUsersForManagement(target.members);
    };

    const form = document.getElementById('manage-channel-form');
    if (form) {
        // ⚠️ Retire l'ancien écouteur s'il existe (pour éviter la duplication lors de l'ouverture de différents canaux)
        form.removeEventListener('submit', handleChannelUpdate); 
        form.addEventListener('submit', handleChannelUpdate);
    }
}

/**
 * 🆕 Récupère les utilisateurs et popule la modale de gestion.
 */
async function loadUsersForManagement(currentMembers) {
    try {
        const usersCollectionPath = collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'users');
        const qUsers = query(usersCollectionPath, orderBy('username', 'asc'));
        const snapshot = await getDocs(qUsers);
        const allUsers = snapshot.docs.map(doc => doc.data());
        
        populateUserCheckboxes(allUsers, 'manage-member-checkbox-list', currentMembers);
        
    } catch(error) {
        console.error("Erreur lors du chargement des utilisateurs pour la gestion:", error);
    }
}


/**
 * 🆕 Gère la soumission du formulaire de mise à jour du canal.
 */
async function handleChannelUpdate(e) {
    e.preventDefault();

    const channelId = document.getElementById('manage-channel-id').value;
    const name = document.getElementById('manage-channel-name-input').value.trim();
    const color = document.getElementById('manage-channel-color-input').value;
    const selectedMembers = Array.from(document.querySelectorAll('#manage-member-checkbox-list input:checked'))
                                 .map(checkbox => checkbox.value);
    
    if (!channelId || !name) return;

    const channelRef = doc(collection(doc(collection(window.db, 'artifacts'), window.appId), 'public', 'data', 'channels'), channelId);

    // S'assurer que l'utilisateur actuel est toujours inclus
    const allMembersSet = new Set([window.currentUser.username, ...selectedMembers]);
    const allMembers = Array.from(allMembersSet);

    try {
        await updateDoc(channelRef, {
            name: name,
            color: color,
            members: allMembers,
        });

        document.getElementById('channel-management-modal').style.display = 'none';
        alert(`Canal "${name}" mis à jour avec succès.`);
        
        // 💡 Recharger les détails du chat pour mettre à jour immédiatement l'en-tête
        const newTarget = {...getCurrentChatTarget(), name: name, color: color, members: allMembers};
        renderChatDetail(newTarget);

    } catch(error) {
        console.error("Échec de la mise à jour du canal:", error);
        alert("Échec de la mise à jour du canal. Vérifiez la console.");
    }
}