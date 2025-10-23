// /checking/js/checking.js

// Importation des sous-modules
import * as CheckModule from './check.js';
import * as SuivieModule from './suivie.js';

// Exporté pour être appelé par script.js (génération du menu de gauche)
export function generateCheckingMenu() {
    return `
        <nav class="checking-menu">
            <a href="#" class="menu-item active" data-detail="check">Check-in/out</a>
            <a href="#" class="menu-item" data-detail="suivie">Suivi des Shifts</a>
            <a href="#" class="menu-item" data-detail="conge">Congés</a>
            <a href="#" class="menu-item" data-detail="salaire">Salaires</a>
        </nav>
    `;
}

// Exporté pour être appelé par script.js (génération du contenu de droite)
export function generateCheckingDetail(detailName, currentUser) {
    let html = `<h1 style="display:none;">${detailName.charAt(0).toUpperCase() + detailName.slice(1)}</h1>`;

    switch (detailName) {
        case 'check':
            // Utilisation de la fonction de rendu du module Check-in/out
            html += CheckModule.generateCheckDetail(currentUser);
            break;
        case 'suivie':
            // Utilisation de la fonction de rendu du module Suivi
            html += SuivieModule.generateSuivieTables();
            break;
        case 'conge':
            html += `<p>Gérez ici vos demandes de congés et consultez votre solde.</p>`;
            break;
        case 'salaire':
            html += `<p>Consultez ici vos fiches de paie et informations salariales.</p>`;
            break;
    }
    return html;
}

// Exporté pour être appelé par script.js (démarrage du module)
export async function initializeCheckingEvents() {
    const currentUser = window.currentUser;
    if (!currentUser) return;

    // Charger l'état quotidien AVANT de générer l'UI, car 'check' est la vue par défaut
    await CheckModule.loadUserShiftData(currentUser.username);

    const contentRight = document.getElementById('content-right');
    const defaultDetail = 'check';

    // Rendre le contenu par défaut
    if (contentRight) {
        contentRight.innerHTML = generateCheckingDetail(defaultDetail, currentUser);
    }

    // Démarrer les événements pour la vue initiale ('check' par défaut)
    if (CheckModule.dailyShiftState.state !== 'NON_WORK_DAY') {
        CheckModule.updateCheckUI();
        CheckModule.startTimeWatcher();
    }


    // Attacher les gestionnaires de clics pour la navigation interne (Menu de gauche)
    document.querySelectorAll('.checking-menu .menu-item').forEach(item => {
        item.removeEventListener('click', handleCheckingMenuClick);
        item.addEventListener('click', handleCheckingMenuClick);
    });
}

// Gestionnaire de la navigation interne
async function handleCheckingMenuClick(e) {
    e.preventDefault();
    const detailName = e.currentTarget.dataset.detail;
    const currentUser = window.currentUser;
    const contentRight = document.getElementById('content-right');

    // Mettre à jour la classe 'active'
    document.querySelectorAll('.checking-menu .menu-item').forEach(i => i.classList.remove('active'));
    e.currentTarget.classList.add('active');

    // Arrêter le timer si on quitte la vue 'check'
    if (detailName !== 'check') {
        CheckModule.stopTimeWatcher();
    }

    // Pré-charger les données spécifiques aux autres vues si nécessaire
    if (detailName === 'suivie') {
        await SuivieModule.loadAllShiftHistory();
    }

    // Générer et afficher le nouveau contenu
    if (contentRight) {
        contentRight.innerHTML = generateCheckingDetail(detailName, currentUser);
    }

    // Redémarrer/initialiser les événements spécifiques
    if (detailName === 'check' && CheckModule.dailyShiftState.state !== 'NON_WORK_DAY') {
        CheckModule.updateCheckUI();
        CheckModule.startTimeWatcher();
    }
}

// Exporté pour être appelé par script.js lors d'un changement de vue principal
export function stopCheckingEvents() {
    CheckModule.stopTimeWatcher();
    const button = document.getElementById('main-check-button');
    if (button) {
        button.onclick = null;
    }
}