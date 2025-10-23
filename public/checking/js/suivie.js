// /checking/js/suivie.js

// --- Fonctions utilitaires pour le temps et la date ---

/**
 * Convertit une chaîne de temps (HH:MM:SS ou N/A) en secondes.
 * @param {string} timeStr - Chaîne de temps.
 * @returns {number} Temps en secondes.
 */
function timeStringToSeconds(timeStr) {
    if (timeStr === 'N/A') return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

/**
 * Convertit un nombre total de secondes en format HHh MMmin SSs.
 * @param {number} totalSeconds - Temps total en secondes.
 * @returns {string} Chaîne formatée.
 */
function secondsToHoursMinutesSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}min ${pad(seconds)}s`;
}

/**
 * Normalise un objet Date en une clé de chaîne DD/MM/YYYY pour une cohérence maximale.
 * @param {Date} date - L'objet Date à formater.
 * @returns {string} La clé de date au format DD/MM/YYYY.
 */
function formatDateKey(date) {
    // Utiliser Intl.DateTimeFormat pour s'assurer que le format est cohérent
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    // On retire les slashs pour que ça fonctionne sur tous les navigateurs
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    return `${day}/${month}/${year}`;
}

// --- État global ---
let allCheckinHistory = [];
// Mappe pour un accès rapide: 'DD/MM/YYYY': [record1, record2, ...]
let historyByDate = {};
let uniqueUsers = new Set();
let currentFilters = {
    user: 'all',
    startDate: null,
    endDate: null,
};

let currentViewDate = new Date();
currentViewDate.setDate(1);
let selectedDateKey = null; // Utilisera le format DD/MM/YYYY

// Date d'aujourd'hui formatée
const todayKey = formatDateKey(new Date());

// --- Connexion Firestore (Inchangée) ---
async function getFirestoreRefs(username) {
    if (!window.db || !window.appId || !username) return null;
    try {
        const firestoreImports = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { doc, collection } = firestoreImports;
        const dataDocRef = doc(collection(window.db, 'artifacts'), window.appId, 'public', 'data');
        const allHistoryRef = collection(dataDocRef, 'allShiftHistory');
        return { allHistoryRef };
    } catch(error) {
        console.error("Erreur lors de l'import/accès à Firestore:", error);
        return null;
    }
}

// --- Chargement des données ---
export async function loadAllShiftHistory() {
    const username = window.currentUser?.username;
    if (!username) return;
    const refs = await getFirestoreRefs(username);
    if (!refs) return;
    try {
        const { query, getDocs, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        // On trie par rawShiftStart pour garantir le bon ordre
        const q = query(refs.allHistoryRef, orderBy('rawShiftStart', 'desc'), limit(10000)); 
        const historySnap = await getDocs(q);
        
        allCheckinHistory = historySnap.docs.map(doc => doc.data());
        
        // Groupement par la clé 'date' (qui doit être au format DD/MM/YYYY grâce à check.js)
        historyByDate = allCheckinHistory.reduce((acc, record) => {
            // CORRECTION: Assurez-vous que la clé utilisée est au format DD/MM/YYYY, 
            // car le format complet utilisé dans check.js peut être problématique.
            // On se base sur rawShiftStart pour créer une clé fiable.
            let dateKey;
            if (record.rawShiftStart) {
                 dateKey = formatDateKey(new Date(record.rawShiftStart));
            } else {
                // Fallback si rawShiftStart est absent, mais ce n'est pas idéal
                dateKey = record.date.substring(record.date.length - 10).replace(/ /g, '/'); // Tente d'extraire DD/MM/YYYY de la chaîne complète
            }

            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(record);
            uniqueUsers.add(record.user);
            return acc;
        }, {});

        console.log(`✅ ${allCheckinHistory.length} enregistrements d'historique global chargés et groupés.`);
    } catch (e) {
        console.error("❌ Erreur de chargement de l'historique global depuis Firestore:", e);
        allCheckinHistory = [];
        historyByDate = {};
    }
}

// --- Génération de l'interface ---
export function generateSuivieTables() {
    let containerHtml = `
        <div class="suivie-container">
            <div class="suivie-controls-wrapper">
                ${generateControlsAndSummaryHtml()}
            </div>

            <div class="suivie-main-content">
                <div class="suivie-agenda-wrapper" id="suivie-agenda-wrapper">
                    ${generateCalendarHtml()}
                </div>
                
                <div class="suivie-detail-view" id="suivie-detail-view">
                    ${generateDetailViewHtml()}
                </div>
            </div>
        </div>
    `;
    return containerHtml;
}

// --- Contrôles et Résumé (Avec ajout des icônes) ---
function generateControlsAndSummaryHtml() {
    return `
        <div class="suivie-controls">
            <div class="filter-group">
                <span class="control-icon">👤</span> 
                <label for="user-filter">Filtrer Utilisateur:</label>
                <select id="user-filter" onchange="window.handleFilterChange()">
                    <option value="all">Tous les Collaborateurs</option>
                    ${Array.from(uniqueUsers).map(user => 
                        `<option value="${user}" ${currentFilters.user === user ? 'selected' : ''}>${user}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group date-range-group">
                <span class="control-icon">📅</span>
                <label for="start-date-filter">Période de Calcul:</label>
                <input type="date" id="start-date-filter" value="${currentFilters.startDate || ''}" onchange="window.handleFilterChange()">
                <span class="control-icon">➡️</span>
                <input type="date" id="end-date-filter" value="${currentFilters.endDate || ''}" onchange="window.handleFilterChange()">
            </div>
        </div>
        
        <div class="suivie-summary-calculation" id="suivie-summary-calculation">
            ${calculateSummaryHtml()}
        </div>
    `;
}

function calculateSummaryHtml() {
    let totalShiftSeconds = 0;
    let totalPauseSeconds = 0;
    let shiftsCount = 0;

    const selectedUser = currentFilters.user;
    const start = currentFilters.startDate;
    const end = currentFilters.endDate;

    let startDateObj = null;
    let endDateObj = null;

    if (start) {
        startDateObj = new Date(start);
        startDateObj.setHours(0, 0, 0, 0);
    }
    if (end) {
        endDateObj = new Date(end);
        // Ajout d'un jour pour inclure le jour de fin complet
        endDateObj.setDate(endDateObj.getDate() + 1); 
        endDateObj.setHours(0, 0, 0, 0);
    }

    const filteredRecords = allCheckinHistory.filter(record => {
        if (selectedUser !== 'all' && record.user !== selectedUser) {
            return false;
        }
        
        if (startDateObj || endDateObj) {
            // Utiliser rawShiftStart pour une comparaison de date fiable (timestamp)
            const recordDate = new Date(record.rawShiftStart);
            recordDate.setHours(0, 0, 0, 0); // La comparaison est sur le jour

            // Correction de la date pour la comparaison (le timestamp est suffisant, mais la date doit être juste)
            const recordDay = new Date(record.rawShiftStart);
            recordDay.setHours(0, 0, 0, 0);

            if (startDateObj && recordDay < startDateObj) {
                return false;
            }
            if (endDateObj && recordDay >= endDateObj) {
                return false;
            }
        }
        
        return true;
    });

    filteredRecords.forEach(record => {
        // totalShift et totalPause sont des chaînes (HH:MM:SS), timeStringToSeconds renvoie 0 si 'N/A'
        totalShiftSeconds += timeStringToSeconds(record.totalShift);
        totalPauseSeconds += timeStringToSeconds(record.totalPause);
        shiftsCount++;
    });

    const totalShiftStr = secondsToHoursMinutesSeconds(totalShiftSeconds);
    const totalPauseStr = secondsToHoursMinutesSeconds(totalPauseSeconds);
    
    return `
        <div class="summary-card-container">
            <div class="summary-card">
                <div class="summary-label">Collaborateur</div>
                <div class="summary-value">${selectedUser === 'all' ? 'TOUS' : selectedUser}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Shifts</div>
                <div class="summary-value">${shiftsCount}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Heures Travaillées</div>
                <div class="summary-value text-ok">${totalShiftStr}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Pauses</div>
                <div class="summary-value text-alert">${totalPauseStr}</div>
            </div>
        </div>
        <p class="summary-info">${start && end ? `Calcul du **${start}** au **${end}**` : 'Calcul Global (tous enregistrements).'}</p>
    `;
}


// --- Calendrier (Mise à jour pour le bouton Aujourd'hui et la classe Today) ---
function generateCalendarHtml() {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthName = currentViewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    let calendarHtml = '';
    
    // Structure du calendrier mise à jour pour le bouton Aujourd'hui
    calendarHtml += `
        <div class="month-navigation">
            <button class="nav-arrow" onclick="window.changeMonth(-1)">&#9664;</button>
            <div class="month-header">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
            <div class="nav-group">
                <button class="today-button" onclick="window.goToToday()">Aujourd'hui</button>
                <button class="nav-arrow" onclick="window.changeMonth(1)">&#9654;</button>
            </div>
        </div>
    `;

    calendarHtml += `
        <div class="month-days-grid day-of-week-header">
            <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
        </div>
    `;

    calendarHtml += `<div class="month-days-grid">`;
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startDayOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); 
    
    for (let i = 0; i < startDayOffset; i++) {
        calendarHtml += `<div class="day-cell day-empty"></div>`;
    }

    let day = 1;
    while (new Date(year, month, day).getMonth() === month) {
        const dateObj = new Date(year, month, day);
        const dateKey = formatDateKey(dateObj); // Clé DD/MM/YYYY
        
        let cellClass = 'day-cell day-valid';
        let records = historyByDate[dateKey] || []; // Utilise la clé DD/MM/YYYY
        
        // Ajout de la classe "day-today" si c'est aujourd'hui
        if (dateKey === todayKey) {
            cellClass += ' day-today';
        }

        if (records.length > 0) {
            const userRecords = records.filter(r => currentFilters.user === 'all' || r.user === currentFilters.user);
            
            if (userRecords.length > 0) {
                const allComplete = userRecords.every(r => r.totalShift !== 'N/A' && timeStringToSeconds(r.totalShift) > 0);

                if (allComplete) {
                    cellClass += ' day-checked-complete';
                } else {
                    cellClass += ' day-checked-partial';
                }
            } else {
                cellClass += ' day-unchecked';
            }
        } else {
            cellClass += ' day-unchecked';
        }
        
        if (dateKey === selectedDateKey) {
             cellClass += ' day-selected';
        }

        calendarHtml += `
            <div class="${cellClass}" data-date="${dateKey}" onclick="window.showDetailView('${dateKey}')">
                ${day}
            </div>
        `;
        day++;
    }

    calendarHtml += `</div>`;
    return calendarHtml;
}

// --- Vue de Détail ---
function generateDetailViewHtml() {
    // selectedDateKey est au format DD/MM/YYYY
    if (!selectedDateKey) {
        return `<div class="detail-placeholder">Cliquez sur un jour du calendrier pour voir les détails des shifts.</div>`;
    }
    
    const tableHtml = generateDetailTableHtml(selectedDateKey);
    
    return `
        <h3 class="detail-title">Détails des Shifts pour le ${selectedDateKey}</h3>
        <div id="suivie-detail-content">
            ${tableHtml}
        </div>
    `;
}

/**
 * Génère le HTML pour le tableau détaillé d'un jour spécifique.
 * @param {string} dateKey - Clé de date (DD/MM/YYYY).
 * @returns {string} Le HTML du tableau des détails.
 */
function generateDetailTableHtml(dateKey) {
    // Récupère directement les records grâce à la clé DD/MM/YYYY
    const records = historyByDate[dateKey] || [];
    
    // Filtrage basé sur l'utilisateur sélectionné
    const filteredRecords = records.filter(r => currentFilters.user === 'all' || r.user === currentFilters.user);

    if (filteredRecords.length === 0) {
        return `<p class="no-records-message">Aucun shift enregistré ${currentFilters.user === 'all' ? 'pour ce jour.' : `pour **${currentFilters.user}** ce jour.`}</p>`;
    }

    const TARGET_SHIFT_SECONDS = 8 * 3600;
    const MAX_PAUSE_SECONDS = 1 * 3600;

    let tableHtml = `
        <table class="suivie-table">
            <thead>
                <tr>
                    <th>Collaborateur</th>
                    <th>Début Shift</th>
                    <th>DÉBUT PAUSE</th>
                    <th>FIN PAUSE</th>
                    <th>Fin Shift</th>
                    <th>Total Pause</th>
                    <th class="total-shift-header">Total Shift</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filteredRecords.forEach(record => {
        const totalPauseSeconds = timeStringToSeconds(record.totalPause);
        const totalShiftSeconds = timeStringToSeconds(record.totalShift);

        let pauseClass = (totalPauseSeconds >= MAX_PAUSE_SECONDS) ? 'text-alert' : 'text-ok';
        let shiftClass = (totalShiftSeconds >= TARGET_SHIFT_SECONDS) ? 'text-ok' : 'text-alert';
        
        tableHtml += `
            <tr>
                <td>${record.user}</td>
                <td>${record.shiftStart}</td>
                <td>${record.pauseStart || 'N/A'}</td>
                <td>${record.pauseEnd || 'N/A'}</td>
                <td>${record.shiftEnd || 'N/A'}</td>
                <td><span class="${pauseClass}">${record.totalPause || 'N/A'}</span></td>
                <td><span class="${shiftClass}">${record.totalShift || 'N/A'}</span></td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    return tableHtml;
}


// --- Fonctions globales d'interaction ---

window.updateSuivieView = function() {
    const agendaWrapper = document.getElementById('suivie-agenda-wrapper');
    if (agendaWrapper) {
        agendaWrapper.innerHTML = generateCalendarHtml();
    }
    
    const summaryDiv = document.getElementById('suivie-summary-calculation');
    if (summaryDiv) {
        summaryDiv.innerHTML = calculateSummaryHtml();
    }
    
    // Mise à jour de la vue détaillée pour refléter le filtre utilisateur et la date sélectionnée
    const detailView = document.getElementById('suivie-detail-view');
    if (detailView) {
        detailView.innerHTML = generateDetailViewHtml();
    }
};

window.handleFilterChange = function() {
    const userFilter = document.getElementById('user-filter');
    const startDateFilter = document.getElementById('start-date-filter');
    const endDateFilter = document.getElementById('end-date-filter');

    if (userFilter) currentFilters.user = userFilter.value;
    if (startDateFilter) currentFilters.startDate = startDateFilter.value;
    if (endDateFilter) currentFilters.endDate = endDateFilter.value;

    window.updateSuivieView();
};

window.changeMonth = function(delta) {
    const newDate = new Date(currentViewDate.setMonth(currentViewDate.getMonth() + delta));
    currentViewDate = newDate;
    window.updateSuivieView();
};

/**
 * Ramène la vue du calendrier au mois actuel et sélectionne le jour actuel.
 */
window.goToToday = function() {
    const today = new Date();
    // Met la vue du calendrier sur le mois actuel (jour 1)
    currentViewDate = new Date(today.getFullYear(), today.getMonth(), 1); 
    // Sélectionne le jour actuel
    window.showDetailView(todayKey);
};


window.showDetailView = function(dateKey) {
    // Désélectionner l'ancienne date
    if (selectedDateKey) {
        // Utiliser la clé de date pour désélectionner l'ancienne cellule
        const oldSelected = document.querySelector(`.day-cell[data-date="${selectedDateKey.replace(/\//g, '\\/')}"]`);
        if (oldSelected) {
            oldSelected.classList.remove('day-selected');
        }
    }
    
    selectedDateKey = dateKey;
    const newSelected = document.querySelector(`.day-cell[data-date="${selectedDateKey.replace(/\//g, '\\/')}"]`);
    if (newSelected) {
        newSelected.classList.add('day-selected');
    }
    
    // Afficher les détails à droite
    const detailView = document.getElementById('suivie-detail-view');
    if (detailView) {
        detailView.innerHTML = generateDetailViewHtml();
    }
};

// --- Initialisation ---
export async function initializeSuivieEvents() {
    const initialStart = new Date(2025, 9, 1);
    if (currentViewDate < initialStart) {
        currentViewDate = initialStart;
    }

    // On attend le chargement des données avant d'initialiser l'UI
    await loadAllShiftHistory();
    
    // Initialise la date sélectionnée et la vue sur le jour actuel
    window.goToToday(); 
}