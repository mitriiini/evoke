/**
 * logout.js
 * Ce module gère la vue de déconnexion (logout).
 */

// Fonction pour générer le contenu HTML de la vue de déconnexion
export const generateLogoutContent = (currentUser) => {
    const username = currentUser ? currentUser.username : 'Utilisateur';
    const role = currentUser ? currentUser.role : 'Invité';

    const leftContent = `
        <div class="logout-panel-left">
            <h2>Session Actuelle</h2>
            <div class="user-info-summary">
                <p><strong>Nom d'utilisateur:</strong> ${username}</p>
                <p><strong>Rôle:</strong> ${role}</p>
            </div>
            <p class="warning-text">La déconnexion mettra fin à votre session et vous devrez vous reconnecter pour accéder aux données.</p>
        </div>
    `;

    const rightContent = `
        <div class="logout-panel-right">
            <h1>Déconnexion</h1>
            <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
            <div class="logout-actions">
                <button id="confirm-logout-btn" class="logout-button-confirm">Quitter</button>
            </div>
        </div>
    `;

    return {
        left: leftContent,
        right: rightContent
    };
};

// Fonction pour initialiser les événements (écouteur de clic)
export const initializeLogoutEvents = () => {
    const logoutButton = document.getElementById('confirm-logout-btn');

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Appel de la fonction de déconnexion globale définie dans login.js
            if (window.logout) {
                window.logout();
            } else {
                console.error("La fonction window.logout n'est pas définie.");
                alert("Erreur de déconnexion : fonction non trouvée.");
            }
        });
    }
};