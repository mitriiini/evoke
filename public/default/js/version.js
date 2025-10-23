// === Création dynamique du bloc version et help ===
document.addEventListener("DOMContentLoaded", () => {
  const versionBox = document.createElement("div");
  versionBox.className = "version-box";

  const versionText = document.createElement("span");
  versionText.textContent = "v0.0.1-20102025";

  const helpBtn = document.createElement("button");
  helpBtn.className = "version-help";
  helpBtn.textContent = "Help";

  const infoBox = document.createElement("div");
  infoBox.className = "version-info";
  infoBox.textContent = "Miarintsoa Fanampy Nirinah";

  versionBox.appendChild(versionText);
  versionBox.appendChild(helpBtn);
  versionBox.appendChild(infoBox);
  document.body.appendChild(versionBox);

  // Toggle affichage sur clic
  helpBtn.addEventListener("click", () => {
    infoBox.classList.toggle("show");
  });

  // Affichage au survol
  helpBtn.addEventListener("mouseenter", () => {
    infoBox.classList.add("show");
  });
  helpBtn.addEventListener("mouseleave", () => {
    infoBox.classList.remove("show");
  });
  
  // Suppression de la logique d'inversion des couleurs via IntersectionObserver
  // car le CSS "backdrop-filter: invert(100%);" gère déjà cela
});