// media_utils.js ///////// //////// ////////// media_utils.js //////////
// Importe la fonction d'envoi de message générique de Firestore
import { sendMediaMessage } from './firebase_utils.js';
import { getCurrentChatTarget } from './firebase_utils.js';
import { sendTypingStatus } from './firebase_utils.js'; // Pour désactiver le statut après l'envoi

/**
 * 🆕 Fonction pour uploader un fichier sur Cloudinary.
 * @param {File | Blob} file Le fichier ou Blob à uploader.
 * @param {string} resourceType Le type de ressource ('image', 'video', 'audio', 'raw').
 */
export async function uploadFileToCloudinary(file, resourceType = 'auto') {
    const CLOUD_NAME = 'dslrfgmlv';
    const UPLOAD_PRESET = 'evoke-projet';
    const target = getCurrentChatTarget();

    if (!target) {
        throw new Error("Aucun chat cible sélectionné.");
    }
    
    // Détermine le type de média pour Cloudinary
    let type = resourceType;
    if (resourceType === 'auto') {
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else type = 'raw';
    }

    // Correction de la construction de l'URL d'upload
    // L'URL d'API Cloudinary pour l'upload est:
    // https://api.cloudinary.com/v1_1/CLOUD_NAME/resource_type/upload
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`;

    // Le format FormData est nécessaire pour l'upload REST
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('resource_type', type);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur Cloudinary:', errorText);
            throw new Error(`Échec de l'upload Cloudinary: ${response.status} - ${errorText || 'Erreur inconnue'}`);
        }

        const data = await response.json();
        
        // Envoi du message dans Firestore après l'upload réussi
        await sendMediaMessage(target, data.secure_url, type, data.public_id);
        
        // Désactive le statut d'écriture après l'envoi de média (si chat privé)
        if (target.type === 'user') {
            sendTypingStatus(target.username, false);
        }
        
    } catch (error) {
        console.error("Erreur lors de l'upload ou de l'envoi du message:", error);
        throw error;
    }
}