// /checking/js/check.js

// Constantes et Variables Globales
const TIME_ZONE = 'Europe/Paris';
const TIME_OPTIONS = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: TIME_ZONE };

const SCHEDULE = {
    SHIFT_START: '10:00',
    SHIFT_END: '18:00',
    PAUSE_START: '13:00',
    PAUSE_END: '14:00',
    BUTTON_START_HOUR: 8,
    BUTTON_END_HOUR: 22
};

let timeWatcherInterval = null;
export let dailyShiftState = {}; // Exporté pour être lu par checking.js
let notificationState = {
    preShiftFired: false,
    prePauseFired: false,
    overduePauseFired: false,
    preEndShiftFired: false
};

// --- Utils Firestore & State Management ---

function timeStringToSeconds(timeStr) {
    if (timeStr === 'N/A') return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Fonction utilitaire pour formater la date en DD/MM/YYYY (doit être définie ici aussi)
function formatDateKey(date) {
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


async function getFirestoreRefs(username) {
    if (!window.db || !window.appId || !username) return null;
    try {
        const firestoreImports = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp } = firestoreImports;
        const dataDocRef = doc(collection(window.db, 'artifacts'), window.appId, 'public', 'data');
        const userShiftStateRef = doc(collection(dataDocRef, 'shiftStates'), username);
        const userHistoryRef = collection(dataDocRef, 'shiftHistory', username, 'records');
        const allHistoryRef = collection(dataDocRef, 'allShiftHistory');

        return { doc, getDoc, setDoc, collection, updateDoc, serverTimestamp, userShiftStateRef, userHistoryRef, allHistoryRef };
    } catch(error) {
        console.error("Erreur lors de l'import/accès à Firestore:", error);
        return null;
    }
}

async function saveDailyState() {
    const username = window.currentUser?.username;
    if (!username || Object.keys(dailyShiftState).length === 0) return;
    try {
        const refs = await getFirestoreRefs(username);
        if (!refs) return;
        dailyShiftState.lastUpdated = refs.serverTimestamp();
        await refs.setDoc(refs.userShiftStateRef, dailyShiftState, { merge: true });
    } catch (e) {
        console.error("❌ Erreur de sauvegarde de l'état du shift dans Firestore:", e);
    }
}

async function saveShiftRecord(record) {
    const username = window.currentUser?.username;
    if (!username) return;
    try {
        const refs = await getFirestoreRefs(username);
        if (!refs) return;
        const { addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        await addDoc(refs.userHistoryRef, record);
        await addDoc(refs.allHistoryRef, record);

        console.log("✅ Enregistrement de shift finalisé dans l'historique Firestore (personnel et global).");

    } catch (e) {
        console.error("❌ Erreur d'enregistrement du rapport de shift dans Firestore:", e);
    }
}

function initializeDailyState(username, isNonWorkDay = false) {
    const todayKey = new Date().toISOString().split('T')[0];
    stopTimeWatcher();
    dailyShiftState = {
        user: username,
        dateKey: todayKey,
        state: isNonWorkDay ? 'NON_WORK_DAY' : 'START_SHIFT',
        shiftStart: null,
        rawShiftStart: null,
        pauseStart: null,
        rawPauseStart: null,
        pauseEnd: null,
        rawPauseEnd: null,
        shiftEnd: null,
        pauseTotalTime: 0,
        shiftTotalTime: 0,
        logs: [],
        shiftElapsedTime: 0,
        pauseElapsedTime: 0
    };
    notificationState = { preShiftFired: false, prePauseFired: false, overduePauseFired: false, preEndShiftFired: false };
    saveDailyState();
}

export async function loadUserShiftData(username) {
    if (!username) return;
    const refs = await getFirestoreRefs(username);
    if (!refs) return;
    const todayKey = new Date().toISOString().split('T')[0];
    try {
        const stateSnap = await refs.getDoc(refs.userShiftStateRef);
        let loadedState = stateSnap.exists() ? stateSnap.data() : {};
        if (loadedState.dateKey === todayKey && loadedState.user === username) {
            dailyShiftState = loadedState;
            console.log("✅ État du shift quotidien restauré depuis Firestore.");
        } else {
            console.log("Initialisation d'un nouvel état de shift quotidien.");
            initializeDailyState(username);
            return;
        }
    } catch (e) {
        console.error("❌ Erreur de chargement des données de shift depuis Firestore:", e);
        initializeDailyState(username);
    }
}


// --- Utils Temps & Calculs ---

function getParisTime() {
    const now = new Date();
    const parisTimeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: TIME_ZONE
    });
    const [h, m, s] = parisTimeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m;
    return { h, m, s, totalMinutes, now };
}

function updateCalculatedTimes() {
    const now = Date.now();
    let currentShiftElapsedTime = 0;
    let currentPauseElapsedTime = 0;
    let totalLoggedPause = dailyShiftState.pauseTotalTime || 0;

    if (dailyShiftState.rawShiftStart) {
        const totalDurationFromStart = now - dailyShiftState.rawShiftStart;

        if (dailyShiftState.state === 'DURING_PAUSE' && dailyShiftState.rawPauseStart) {
            currentPauseElapsedTime = Math.floor((now - dailyShiftState.rawPauseStart) / 1000);
            currentShiftElapsedTime = Math.max(0, Math.floor((totalDurationFromStart - (totalLoggedPause * 1000) - (currentPauseElapsedTime * 1000)) / 1000));
        }
        else if (dailyShiftState.state !== 'START_SHIFT' && dailyShiftState.state !== 'NON_WORK_DAY') {
            currentShiftElapsedTime = Math.max(0, Math.floor((totalDurationFromStart - (totalLoggedPause * 1000)) / 1000));
        }
    }

    dailyShiftState.shiftElapsedTime = currentShiftElapsedTime;
    dailyShiftState.pauseElapsedTime = currentPauseElapsedTime;

    if (Math.floor(now / 1000) % 10 === 0) {
        saveDailyState();
    }
}


// --- Notifications ---

function getUserNotifPrefs() {
    const defaultPrefs = {
        enabled: true,
        audioEnabled: true,
        audioFile: '1.mp3',
        preShift: 5,
        prePause: 5,
        postPause: 1,
        preEndShift: 5
    };
    const savedPrefs = JSON.parse(localStorage.getItem('userNotifPrefs')) || {};
    return { ...defaultPrefs, ...savedPrefs };
}

function playNotificationSound() {
    const prefs = getUserNotifPrefs();
    if (prefs.enabled && prefs.audioEnabled) {
        const audio = new Audio(`/checking/audio/${prefs.audioFile}`);
        audio.play().catch(e => console.warn("Impossible de jouer le son de notification:", e));
    }
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log("Permission de notification desktop :", permission);
            });
        }
    }
}

function showNativeNotification(title, body) {
    const prefs = getUserNotifPrefs();
    if (prefs.enabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            vibrate: [200, 100, 200]
        });
        playNotificationSound();
    }
}

function showFullScreenNotification(message) {
    const prefs = getUserNotifPrefs();
    if (!prefs.enabled) return;

    const existingOverlay = document.getElementById('fullscreen-notification-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-notification-overlay';
    overlay.innerHTML = `
        <div class="notification-content">
            <h1>RAPPEL IMPORTANT</h1>
            <p>${message}</p>
            <button onclick="document.getElementById('fullscreen-notification-overlay').remove()">OK, J'ai compris</button>
        </div>
    `;
    document.body.appendChild(overlay);

    if (!('Notification' in window && Notification.permission === 'granted')) {
        playNotificationSound();
    }
}

function checkTimeConditions() {
    const { h, m, totalMinutes } = getParisTime();
    const button = document.getElementById('main-check-button');
    if (!button) return;

    const prefs = getUserNotifPrefs();
    if (!prefs.enabled) {
        notificationState = { preShiftFired: false, prePauseFired: false, overduePauseFired: false, preEndShiftFired: false };
    }

    const isButtonAvailableTime = h >= SCHEDULE.BUTTON_START_HOUR && h < SCHEDULE.BUTTON_END_HOUR;
    const isReadyForShift = dailyShiftState.state === 'START_SHIFT';

    if (isReadyForShift) {
        button.disabled = !isButtonAvailableTime;
        if (!isButtonAvailableTime) {
            button.textContent = (h < SCHEDULE.BUTTON_START_HOUR) ? `SHIFT dispo à ${SCHEDULE.BUTTON_START_HOUR}h` : 'SHIFT terminé pour aujourd\'hui';
            button.classList.add('disabled-time');
        } else {
            button.textContent = 'DÉBUT SHIFT';
            button.classList.remove('disabled-time');
        }
    } else if (dailyShiftState.state === 'COMPLETED' || dailyShiftState.state === 'NON_WORK_DAY') {
            button.disabled = true;
    }

    const scheduledShiftStartMinutes = timeStringToSeconds(SCHEDULE.SHIFT_START + ':00') / 60;
    const scheduledPauseStartMinutes = timeStringToSeconds(SCHEDULE.PAUSE_START + ':00') / 60;
    const scheduledPauseEndMinutes = timeStringToSeconds(SCHEDULE.PAUSE_END + ':00') / 60;
    const scheduledShiftEndMinutes = timeStringToSeconds(SCHEDULE.SHIFT_END + ':00') / 60;

    const preShiftTime = scheduledShiftStartMinutes - prefs.preShift;
    if (prefs.enabled && isReadyForShift && totalMinutes === preShiftTime && !notificationState.preShiftFired) {
        showFullScreenNotification(`Attention, votre shift est sur le point de commencer à ${SCHEDULE.SHIFT_START} ! N'oubliez pas de 'DÉBUT SHIFT'.`);
        showNativeNotification("Rappel Shift", `Votre shift commence dans ${prefs.preShift} minutes (${SCHEDULE.SHIFT_START}). N'oubliez pas de checker !`);
        notificationState.preShiftFired = true;
    }

    const prePauseTime = scheduledPauseStartMinutes - prefs.prePause;
    if (prefs.enabled && dailyShiftState.state === 'DURING_SHIFT' && totalMinutes === prePauseTime && !notificationState.prePauseFired) {
        showFullScreenNotification(`Préparez-vous ! Votre pause est planifiée pour ${SCHEDULE.PAUSE_START}. N'oubliez pas de 'DÉBUT PAUSE'.`);
        showNativeNotification("Rappel Pause", `Votre pause est dans ${prefs.prePause} minutes (${SCHEDULE.PAUSE_START}). N'oubliez pas de checker 'DÉBUT PAUSE'.`);
        notificationState.prePauseFired = true;
    }

    const preEndShiftTime = scheduledShiftEndMinutes - prefs.preEndShift;
    if (prefs.enabled && (dailyShiftState.state === 'DURING_SHIFT' || dailyShiftState.state === 'SHIFT_FINISHED') && totalMinutes === preEndShiftTime && !notificationState.preEndShiftFired) {
        showFullScreenNotification(`Plus que ${prefs.preEndShift} minutes ! Votre shift se termine à ${SCHEDULE.SHIFT_END}. N'oubliez pas de 'FIN SHIFT'.`);
        showNativeNotification("Rappel Fin Shift", `Votre shift se termine dans ${prefs.preEndShift} minutes (${SCHEDULE.SHIFT_END}). N'oubliez pas de checker 'FIN SHIFT'.`);
        notificationState.preEndShiftFired = true;
    }

    const overduePauseTime = scheduledPauseEndMinutes + prefs.postPause;
    if (prefs.enabled && dailyShiftState.state === 'DURING_PAUSE') {
        const isOverdue = totalMinutes === overduePauseTime;

        if (isOverdue && !notificationState.overduePauseFired) {
            showFullScreenNotification(`ATTENTION: Votre pause est terminée depuis ${prefs.postPause} minute(s) (limite ${SCHEDULE.PAUSE_END}) ! Veuillez cliquer sur 'FIN PAUSE' immédiatement.`);
            showNativeNotification("Pause Terminée !", `Il est temps de reprendre. Vous devez cliquer sur FIN PAUSE.`);
            notificationState.overduePauseFired = true;
        }
    }

    if (isReadyForShift && h === 0 && m === 0) {
        notificationState = { preShiftFired: false, prePauseFired: false, overduePauseFired: false, preEndShiftFired: false };
    }
}

export function startTimeWatcher() {
    requestNotificationPermission();
    stopTimeWatcher();
    updateCalculatedTimes();
    checkTimeConditions();
    timeWatcherInterval = setInterval(() => {
        updateCalculatedTimes();
        checkTimeConditions();
    }, 1000);
}

export function stopTimeWatcher() {
    clearInterval(timeWatcherInterval);
    timeWatcherInterval = null;
    const existingOverlay = document.getElementById('fullscreen-notification-overlay');
    if (existingOverlay) existingOverlay.remove();
}

// --- Logique des Boutons de Check ---

async function logEvent(type, newState, timestamp) {
    const timeFormatted = timestamp.toLocaleTimeString('fr-FR', TIME_OPTIONS);
    dailyShiftState.logs.push({
        type: type,
        time: timeFormatted,
        rawTime: timestamp.getTime()
    });
    dailyShiftState.state = newState;
    if (type === 'DÉBUT SHIFT') {
        dailyShiftState.shiftStart = timeFormatted;
        dailyShiftState.rawShiftStart = timestamp.getTime();
        notificationState = { preShiftFired: true, prePauseFired: false, overduePauseFired: false, preEndShiftFired: false };
    }
    if (type === 'DÉBUT PAUSE') {
        dailyShiftState.pauseStart = timeFormatted;
        dailyShiftState.rawPauseStart = timestamp.getTime();
        notificationState.prePauseFired = true;
        notificationState.overduePauseFired = false;
    }
    if (type === 'FIN PAUSE') {
        dailyShiftState.pauseEnd = timeFormatted;
        dailyShiftState.rawPauseEnd = timestamp.getTime();
    }
    if (type === 'FIN SHIFT') {
        dailyShiftState.shiftEnd = timeFormatted;
        notificationState = { preShiftFired: false, prePauseFired: false, overduePauseFired: false, preEndShiftFired: true };
    }
    await saveDailyState();
    updateCheckUI(); // Mise à jour de l'UI
    updateCalculatedTimes(); // Recalcul immédiat
}

function handleStartShift() {
    const now = new Date();
    dailyShiftState.logs = [];
    dailyShiftState.pauseTotalTime = 0;
    dailyShiftState.shiftTotalTime = 0;
    dailyShiftState.rawPauseStart = null;
    dailyShiftState.rawPauseEnd = null;
    logEvent('DÉBUT SHIFT', 'DURING_SHIFT', now);
}

function handleStartPause() {
    const now = new Date();
    logEvent('DÉBUT PAUSE', 'DURING_PAUSE', now);
}

function handleEndPause() {
    const now = new Date();
    if (dailyShiftState.rawPauseStart) {
        const pauseDurationSeconds = Math.floor((now.getTime() - dailyShiftState.rawPauseStart) / 1000);
        dailyShiftState.pauseTotalTime += pauseDurationSeconds;
    }
    logEvent('FIN PAUSE', 'SHIFT_FINISHED', now);
}

async function handleEndShift() {
    const now = new Date();
    let totalShiftSeconds = 0;
    if (dailyShiftState.rawShiftStart) {
        const totalDurationFromStart = now.getTime() - dailyShiftState.rawShiftStart;
        const totalLoggedPause = dailyShiftState.pauseTotalTime || 0;
        totalShiftSeconds = Math.max(0, Math.floor((totalDurationFromStart / 1000) - totalLoggedPause));
    }
    dailyShiftState.shiftTotalTime = totalShiftSeconds;

    const debutShiftLog = dailyShiftState.logs.find(log => log.type === 'DÉBUT SHIFT');
    const shiftStartDate = debutShiftLog ? new Date(debutShiftLog.rawTime) : now;
    
    const record = {
        user: dailyShiftState.user,
        // MODIFICATION: Utilisation de formatDateKey pour la clé DD/MM/YYYY
        date: formatDateKey(shiftStartDate), 
        rawShiftStart: dailyShiftState.rawShiftStart,
        shiftStart: dailyShiftState.shiftStart,
        pauseStart: dailyShiftState.pauseStart || 'N/A',
        pauseEnd: dailyShiftState.pauseEnd || 'N/A',
        shiftEnd: now.toLocaleTimeString('fr-FR', TIME_OPTIONS),
        totalPause: formatTime(dailyShiftState.pauseTotalTime),
        totalShift: formatTime(dailyShiftState.shiftTotalTime),
        logs: dailyShiftState.logs
    };
    await logEvent('FIN SHIFT', 'COMPLETED', now);
    await saveShiftRecord(record);
}

// --- Rendu et Initialisation de l'UI de Check-in/out ---

function updateShiftLogsAndStatus() {
    const statusText = document.getElementById('work-status-text');

    const updateActionRow = (id, time) => {
        const row = document.getElementById(id);
        if (row) {
            const timeSpan = row.querySelector('.action-time');
            if (timeSpan) {
                timeSpan.textContent = time || '--:--:--';
                timeSpan.classList.toggle('pending', !time);
            }
        }
    };

    updateActionRow('action-row-shift-start', dailyShiftState.shiftStart);
    updateActionRow('action-row-pause-start', dailyShiftState.pauseStart);
    updateActionRow('action-row-pause-end', dailyShiftState.pauseEnd);
    updateActionRow('action-row-shift-end', dailyShiftState.shiftEnd);

    if (statusText) {
        let status = '';
        if (dailyShiftState.state === 'START_SHIFT') {
            status = 'Prêt à démarrer';
        } else if (dailyShiftState.state === 'DURING_SHIFT' || dailyShiftState.state === 'SHIFT_FINISHED') {
            status = 'Shift en cours';
        } else if (dailyShiftState.state === 'DURING_PAUSE') {
            status = 'En Pause';
        } else if (dailyShiftState.state === 'COMPLETED') {
            status = 'Shift Terminé';
        } else if (dailyShiftState.state === 'NON_WORK_DAY') {
            status = 'Jour de Repos';
        }
        statusText.textContent = status;
    }
}

export function updateCheckUI() {
    const button = document.getElementById('main-check-button');

    if (!button) return;

    const state = dailyShiftState.state;
    button.className = 'main-check-button';
    button.onclick = null;
    button.disabled = false;

    switch (state) {
        case 'START_SHIFT':
            button.classList.add('start-shift');
            button.textContent = 'DÉBUT SHIFT';
            button.onclick = handleStartShift;
            break;
        case 'DURING_SHIFT':
            button.textContent = 'DÉBUT PAUSE';
            button.classList.add('start-pause');
            button.onclick = handleStartPause;
            break;
        case 'DURING_PAUSE':
            button.textContent = 'FIN PAUSE';
            button.classList.add('end-pause');
            button.onclick = handleEndPause;
            break;
        case 'SHIFT_FINISHED':
            button.textContent = 'FIN SHIFT';
            button.classList.add('end-shift');
            button.onclick = handleEndShift;
            break;
        case 'COMPLETED':
        case 'NON_WORK_DAY':
            button.textContent = (state === 'COMPLETED') ? 'SHIFT COMPLET' : 'JOUR NON OUVRABLE';
            button.classList.add('start-shift');
            button.disabled = true;
            break;
    }

    updateShiftLogsAndStatus();
    checkTimeConditions();
}

export function generateCheckDetail(currentUser) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;

    let html = `<h1 style="display:none;">Check-in/out</h1>`;

    if (!isWorkDay) {
        if (dailyShiftState.state !== 'NON_WORK_DAY') {
            initializeDailyState(currentUser.username, true); // Initialise en jour non ouvrable
        }
        html += `
            <div class="check-container">
                <p class="non-work-day">JOUR NON OUVRABLE</p>
                <p class="work-status">Bon weekend, ${currentUser.username} !</p>
            </div>
        `;
    } else {
        html += `
            <div class="check-container" id="check-main-container">
                <p class="work-status">Statut de service : <span id="work-status-text"></span></p>

                <div class="check-actions-layout">

                    <div class="action-button-group">
                        <button id="main-check-button" class="main-check-button start-shift">DÉBUT SHIFT</button>
                    </div>

                    <div id="shift-actions-summary">
                        <h3>Actions de la Journée</h3>
                        <div id="action-row-shift-start" class="action-row">
                            <span class="action-label">DÉBUT SHIFT :</span>
                            <span class="action-time">--:--:--</span>
                        </div>
                        <div id="action-row-pause-start" class="action-row">
                            <span class="action-label">DÉBUT PAUSE :</span>
                            <span class="action-time">--:--:--</span>
                        </div>
                        <div id="action-row-pause-end" class="action-row">
                            <span class="action-label">FIN PAUSE :</span>
                            <span class="action-time">--:--:--</span>
                        </div>
                        <div id="action-row-shift-end" class="action-row">
                            <span class="action-label">FIN SHIFT :</span>
                            <span class="action-time">--:--:--</span>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }
    return html;
}