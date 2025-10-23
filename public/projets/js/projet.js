// --- /projet/js/projet.js ---

const PROJECTS = [
    { key: 'mutuel_sante', title: 'Mutuel Santé', description: 'Gérez le développement et les mises à jour pour Mutuel Santé.' },
    { key: 'swiss_kap', title: 'Swiss Kap', description: 'Suivi et maintenance des fonctionnalités Swiss Kap.' },
    { key: 'my_metropols', title: 'My Metropols', description: 'Dashboard et gestion des environnements pour My Metropols.' }
];

/**
 * Génère le contenu HTML pour le panneau de gauche (liste des projets).
 */
export function generateProjectMenu(currentProjectKey = 'mutuel_sante') {
    let html = '<ul class="project-menu">';
    PROJECTS.forEach(project => {
        const activeClass = project.key === currentProjectKey ? 'active' : '';
        html += `<li class="project-menu-item ${activeClass}" data-project="${project.key}">${project.title}</li>`;
    });
    html += '</ul>';
    return html;
}

/**
 * Génère le contenu HTML pour le panneau de droite (détails du projet).
 */
export function generateProjectDetail(projectKey) {
    const project = PROJECTS.find(p => p.key === projectKey) || PROJECTS[0];
    
    let html = `<div class="project-detail-panel">
        <h1 style="color: var(--accent-color);">${project.title}</h1>
        <p style="margin-bottom: 20px;">${project.description}</p>
        
        <div class="view-content">
            <h2>Statut Actuel</h2>
            <p><strong>Version:</strong> 3.1.2 (Stable)</p>
            <p><strong>Équipe:</strong> Front-end (Andry, Lionel), Back-end (Miarintsoa)</p>
            <p>Cliquez sur un autre projet à gauche pour changer de vue.</p>
        </div>
    </div>`;
    
    return html;
}

/**
 * Met en place les écouteurs d'événements spécifiques à la vue 'projet'.
 */
export function initializeProjectEvents() {
    const contentLeft = document.getElementById('content-left');
    const contentRight = document.getElementById('content-right');
    
    // --- Gestion de la Navigation dans les Projets (Clics à gauche) ---
    contentLeft.querySelectorAll('.project-menu-item').forEach(item => {
        item.removeEventListener('click', handleProjectClick); 
        item.addEventListener('click', handleProjectClick);
    });

    function handleProjectClick(e) {
        const projectKey = e.currentTarget.getAttribute('data-project');
        
        contentRight.innerHTML = generateProjectDetail(projectKey);
        
        contentLeft.querySelectorAll('.project-menu-item').forEach(li => li.classList.remove('active'));
        e.currentTarget.classList.add('active');
    }
}