// message_input.js ////// //////// ////////// message_input.js //////////
import { getCurrentChatTarget, sendMessage } from './firebase_utils.js';
import { uploadFileToCloudinary } from './media_utils.js';

// --- Émojis Complets ---
const ALL_EMOJIS = [
    // 😃 Émotions & visages
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
    '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
    '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
    '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
    '😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮',
    '🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓',
    '🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺',
    '😦','😧','😨','😰','😥','😢','😭','😱','😖','😣',
    '😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿',
    '💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',

    // 🙌 Gestes & mains
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
    '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
    '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
    '🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣',

    // 👤 Personnes
    '👶','🧒','👦','👧','🧑','👱','👨','👩','🧔','🧓',
    '👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇',
    '🤦','🤷','🧑‍⚕️','👨‍⚕️','👩‍⚕️','🧑‍🎓','👨‍🎓','👩‍🎓',
    '🧑‍🏫','👨‍🏫','👩‍🏫','🧑‍⚖️','👨‍⚖️','👩‍⚖️','🧑‍🌾',
    '🧑‍🍳','👨‍🍳','👩‍🍳','🧑‍🔧','👨‍🔧','👩‍🔧','🧑‍💻',
    '👨‍💻','👩‍💻','🧑‍🎤','👨‍🎤','👩‍🎤','🧑‍🎨','👨‍🎨',
    '👩‍🎨','🧑‍✈️','👨‍✈️','👩‍✈️','👨‍🚀','👩‍🚀','👨‍🚒',
    '👩‍🚒','🧑‍🚒','🕵️','👮','💂','👷','🤴','👸','👳','👲',

    // 🐶 Animaux & nature
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
    '🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒',
    '🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇',
    '🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞',
    '🐜','🪰','🪲','🪳','🦂','🕷️','🕸️','🐢','🐍','🦎',
    '🐙','🦑','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋',
    '🦈','🐊','🦧','🐘','🦣','🦏','🦛','🐪','🐫','🦒',
    '🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐',
    '🦌','🐕','🐩','🐈','🐓','🦃','🕊️','🐇','🐁','🐀',
    '🐿️','🦔','🦇','🐉','🐲','🌵','🎄','🌲','🌳','🌴',
    '🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁',

    // 🍔 Nourriture & boisson
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐',
    '🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑',
    '🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔',
    '🍞','🥐','🥖','🥨','🥯','🧇','🥞','🧈','🍗','🍖',
    '🍕','🌭','🍔','🍟','🍿','🥗','🍝','🍛','🍣','🍱',
    '🍤','🥟','🥠','🍢','🍡','🍧','🍨','🍦','🥧','🍰',
    '🧁','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','☕',
    '🍵','🧃','🥤','🍺','🍻','🍷','🥂','🍸','🍹','🍾',

    // 🏠 Objets / Activités
    '🎯','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾',
    '🏐','🏉','🎱','🏓','🏸','🏒','🏏','🥅','⛳','🪁',
    '🎮','🕹️','🎲','🧩','♟️','🎯','🎳','🎰','🎡','🎢',
    '🎠','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻',
    '🎬','🎨','🎭','🎪','🖼️','🎫','🎟️','🎗️','🎖️','🏅',

    // 💡 Objets divers
    '💼','📱','💻','🖥️','🖨️','⌨️','🖱️','💽','💾','💿',
    '📀','📸','📷','🎥','🎞️','📞','☎️','📟','📠','📺',
    '📻','⏰','⏱️','⏲️','🕰️','⏳','⌛','📡','🔋','🔌',
    '💡','🔦','🕯️','🧯','🛢️','💰','💳','💎','⚖️','🧭',
    '🧱','🔧','🔨','⚒️','🪚','🔩','⚙️','🧰','🪛','🪓',
    '🔪','🧪','🧬','🧫','🩸','💊','💉','🩺','🚪','🪑',

    // 🚗 Transports
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
    '🚚','🚛','🚜','🛻','🚲','🛴','🛵','🏍️','🛺','🚨',
    '🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞',
    '🚝','🚄','🚅','🚈','🚂','✈️','🛫','🛬','🚁','🛶',
    '⛵','🚤','🛳️','🚢','⚓','⛽','🚧','🚦','🚥','🗺️',

    // 🌍 Lieux & nature
    '🌍','🌎','🌏','🌐','🗾','🧭','🏔️','⛰️','🌋','🗻',
    '🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🏘️',

    // 💬 Symboles & divers
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
    '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐',
    '⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓',
    '🔟','💯','🔢','🔤','🔠','🔡','🔣','🔤','🔺','🔻',
    '✅','❌','❗','❕','❓','❔','⚠️','🚫','⛔','🚷',
    '🚯','🚭','🚳','🚱','🔞','🔒','🔓','🔏','🔐','🔑',
    '🗝️','🔨','🛠️','⚙️','⚡','🔥','💥','✨','🌟','💫',
    '💦','💨','🕊️','🎶','🎵','🎼','🏁','🚩','🎌','🏴‍☠️',
    '☀️','🌤️','⛅','🌥️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️',
    '☃️','⛄','🌈','🌂','☂️','☔','💧','🌊','🌫️','🌪️'
];



// 🆕 Variables pour la gestion de l'enregistrement vocal
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let timerInterval;

// 🆕 Fonction pour arrêter l'enregistrement vocal de manière propre
export function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    isRecording = false;
    
    // Réinitialisation de l'UI
    const recordingBar = document.getElementById('recording-bar');
    const form = document.getElementById('chat-form-new');

    if(recordingBar) recordingBar.style.display = 'none';
    if(form) form.style.display = 'flex'; // Afficher la barre de saisie normale
}


/**
 * 🆕 Rendu du HTML de la nouvelle barre d'input.
 * @returns {string} Le code HTML de la barre.
 */
export function renderInputArea() {
    // 🛑 CORRECTION CLÉ: La barre d'input normale (formulaire) est toujours affichée par défaut.
    return `
        <div class="input-wrapper"> 
            <form id="chat-form-new">
                <div class="input-actions-left">
                    
                    <button type="button" id="attachment-btn" class="input-icon-btn" title="Fichier (Photo/Vidéo/Dossier)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M192,120a8,8,0,0,1-8,8H72a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v40h112V72a8,8,0,0,1,16,0Z"></path><path d="M208,64a8,8,0,0,0-8-8H56A48,48,0,0,0,8,104v48a48,48,0,0,0,48,48H200a40,40,0,0,0,40-40V88A24,24,0,0,0,208,64ZM56,192a32,32,0,0,1-32-32V104a32,32,0,0,1,32-32H200a24,24,0,0,1,24,24v56a24,24,0,0,1-24,24Z"></path></svg>
                    </button>
                    <input type="file" id="file-input" style="display: none;" multiple>
                    
                    <button type="button" id="emoji-btn" class="input-icon-btn" title="Émojis">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM68,108a12,12,0,1,1,12,12A12,12,0,0,1,68,108Zm60,0a12,12,0,1,1,12,12A12,12,0,0,1,128,108Zm60,0a12,12,0,1,1,12,12A12,12,0,0,1,188,108Zm-35.34,68.66a8,8,0,0,1-11.32,0,32,32,0,0,0-45.34,0,8,8,0,0,1-11.32-11.32,48,48,0,0,1,68,0A8,8,0,0,1,152.66,176.66Z"></path></svg>
                    </button>
                    
                    <button type="button" id="record-audio-btn" class="input-icon-btn" title="Enregistreur vocal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,176a48,48,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48,48,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,144.91V240a8,8,0,0,1-16,0V208.91A80,80,0,0,0,48,128a8,8,0,0,1,16,0,64,64,0,0,1,128,0a8,8,0,0,1,16,0A80,80,0,0,0,136,208.91Z"></path></svg>
                    </button>
                </div>
                
                <input type="text" id="chat-input-text" placeholder="Écrivez un message..." required autocomplete="off">
                
                <button type="submit" id="send-button-new">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M228.49,203.51l-44-168A16,16,0,0,0,168,24H88A16,16,0,0,0,72.49,35.51l-44,168A16,16,0,0,0,40,224H216a16,16,0,0,0,12.49-20.49ZM88,40h80l40.3,153.15L178.6,183.15a8,8,0,0,0-7.85-1.57L116.14,198a8,8,0,0,1-7.85-1.57l-42-15.89ZM44.7,193.15,85.69,40H72L31.7,193.15Z"></path></svg>
                </button>
            </form>

            <div id="recording-bar" class="recording-bar">
                <button type="button" id="cancel-recording-btn" class="cancel-recording-btn" title="Annuler">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM176,176a8,8,0,0,1-11.31,0L128,139.31l-36.69,36.69a8,8,0,0,1-11.31-11.31L116.69,128,80,91.31a8,8,0,0,1,11.31-11.31L128,116.69l36.69-36.69a8,8,0,0,1,11.31,11.31L139.31,128l36.69,36.69A8,8,0,0,1,176,176Z"></path></svg>
                </button>
                <div class="recording-visual">
                    <span class="recording-dot"></span>
                    <span id="recording-timer">00:00</span>
                    <span class="recording-text">Enregistrement en cours...</span>
                </div>
                <button type="button" id="send-audio-btn-bar" class="send-audio-btn-bar" title="Envoyer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M228.49,203.51l-44-168A16,16,0,0,0,168,24H88A16,16,0,0,0,72.49,35.51l-44,168A16,16,0,0,0,40,224H216a16,16,0,0,0,12.49-20.49ZM88,40h80l40.3,153.15L178.6,183.15a8,8,0,0,0-7.85-1.57L116.14,198a8,8,0,0,1-7.85-1.57l-42-15.89ZM44.7,193.15,85.69,40H72L31.7,193.15Z"></path></svg>
                </button>
            </div>


            <div id="emoji-picker" class="emoji-picker" style="display:none;">
                ${ALL_EMOJIS.map(emoji => `<span class="emoji-item" data-emoji="${emoji}">${emoji}</span>`).join('')}
            </div>
        </div>
    `;
}

/**
 * 🆕 Initialise tous les écouteurs d'événements pour la barre d'input.
 * @param {Object} target La cible du chat.
 */
export function initializeInputEvents(target) {
    setupNewChatFormListener();
    setupNewFileAttachmentListener();
    setupNewAudioRecordingListener();
    setupEmojiPickerListener(); 
}

// --- Écouteurs de la Barre d'Input ---

function setupNewChatFormListener() {
    const form = document.getElementById('chat-form-new');
    if (form) {
        form.removeEventListener('submit', sendMessage); 
        form.addEventListener('submit', sendMessage);
    }
}

// 🆕 Gestion du sélecteur d'émojis
function setupEmojiPickerListener() {
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const input = document.getElementById('chat-input-text');

    if (!emojiBtn || !emojiPicker || !input) return;

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        emojiPicker.style.display = emojiPicker.style.display === 'flex' ? 'none' : 'flex';
    });

    emojiPicker.querySelectorAll('.emoji-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const emoji = item.getAttribute('data-emoji');
            input.value += emoji;
            input.focus();
            emojiPicker.style.display = 'none';
            
            input.dispatchEvent(new Event('input')); 
        });
    });

    // Ferme le sélecteur si l'utilisateur clique ailleurs
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.style.display = 'none';
        }
    });
}


// 🆕 Écouteur pour l'envoi de fichiers
function setupNewFileAttachmentListener() {
    const attachmentBtn = document.getElementById('attachment-btn');
    const fileInput = document.getElementById('file-input');
    
    if (!attachmentBtn || !fileInput) return;

    attachmentBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const input = document.getElementById('chat-input-text');
            const originalPlaceholder = input.placeholder;
            
            input.placeholder = "Téléchargement du fichier en cours...";
            input.disabled = true;

            try {
                await uploadFileToCloudinary(file, 'auto');
                
                input.value = "";
            } catch (error) {
                console.error("Échec de l'envoi du fichier:", error);
            } finally {
                input.disabled = false;
                input.placeholder = originalPlaceholder;
                e.target.value = null; // Réinitialise l'input file
            }
        }
    });
}


// 🆕 Logique d'enregistrement et d'envoi vocal (Utilisation de la nouvelle barre)
function setupNewAudioRecordingListener() {
    const recordBtn = document.getElementById('record-audio-btn');
    // Changement: Send button est maintenant dans la barre d'enregistrement
    const sendBtnBar = document.getElementById('send-audio-btn-bar'); 
    const cancelBtn = document.getElementById('cancel-recording-btn');
    const inputForm = document.getElementById('chat-form-new');
    const recordingBar = document.getElementById('recording-bar');
    const recordingTimer = document.getElementById('recording-timer');

    if (!recordBtn || !sendBtnBar || !cancelBtn || !inputForm || !recordingBar || !recordingTimer) return;
    
    // --- Logique d'enregistrement ---
    const startRecording = async () => {
        try {
            // S'assure de l'arrêt si un enregistrement précédent n'était pas clean
            stopAudioRecording(); 

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Utiliser 'audio/webm' pour la compatibilité
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); 
            audioChunks = [];
            let startTime = Date.now();
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstart = () => {
                isRecording = true;
                if(inputForm) inputForm.style.display = 'none';
                if(recordingBar) recordingBar.style.display = 'flex';
                
                // Démarrage du compteur
                timerInterval = setInterval(() => {
                    const elapsedTime = Date.now() - startTime;
                    const seconds = Math.floor(elapsedTime / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const format = (val) => val.toString().padStart(2, '0');
                    recordingTimer.textContent = `${format(minutes)}:${format(seconds % 60)}`;
                }, 1000);
            };

            mediaRecorder.onstop = async () => {
                isRecording = false;
                clearInterval(timerInterval);
                if(inputForm) inputForm.style.display = 'flex';
                if(recordingBar) recordingBar.style.display = 'none';
                recordingTimer.textContent = '00:00';
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.onerror = (e) => {
                console.error("Erreur d'enregistrement vocal:", e);
                stopAudioRecording(); 
            };


            mediaRecorder.start();

        } catch (err) {
            console.error('Erreur lors de l\'accès au microphone:', err);
            // Affiche un message d'erreur à l'utilisateur si possible
            alert("Erreur: Impossible d'accéder au microphone. Assurez-vous d'avoir donné la permission.");
        }
    };

    // --- Événements des boutons ---
    recordBtn.addEventListener('click', () => {
        // Le bouton de microphone lance l'enregistrement.
        if (!isRecording) {
            startRecording();
        }
    });
    
    cancelBtn.onclick = () => {
        // Arrête l'enregistrement et jette l'audio
        stopAudioRecording(); 
    };

    sendBtnBar.onclick = async () => {
        // Arrête l'enregistrement et envoie l'audio
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            // L'événement onstop se déclenche, qui fait le cleanup UI. On envoie l'audio ici.
            // On attend que l'arrêt soit complet
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            if (audioBlob.size > 0) {
                await sendAudio(audioBlob);
            } else {
                console.warn("Enregistrement vide, annulation de l'envoi.");
            }
        } else {
            // Cas où l'enregistrement s'est arrêté entre-temps (peu probable)
            stopAudioRecording();
        }
    };
}

// Fonction d'envoi de l'audio
async function sendAudio(audioBlob) {
    const input = document.getElementById('chat-input-text');
    const originalPlaceholder = input.placeholder;
    input.placeholder = "Téléchargement de l'audio en cours...";
    input.disabled = true;

    try {
        // L'upload se fait avec le type 'audio'
        await uploadFileToCloudinary(audioBlob, 'audio');
        input.value = "";
    } catch (error) {
        // Le log original est conservé pour le TypeError
        console.error("Échec de l'envoi de l'audio:", error);
    } finally {
        input.disabled = false;
        input.placeholder = originalPlaceholder;
    }
}