/* =========================================================
   Inequality Tycoon: View Switcher & Stepper Management
   ========================================================= */

export function switchView(viewName) {
  const views = {
    lobby: document.getElementById('view-lobby'),
    master: document.getElementById('view-master'),
    projector: document.getElementById('view-projector'),
    player: document.getElementById('view-player'),
    gameover: document.getElementById('view-gameover')
  };

  Object.keys(views).forEach(k => {
    if (views[k]) {
      views[k].classList.remove('active-view');
      views[k].classList.add('hidden-view');
    }
  });
  if (views[viewName]) {
    views[viewName].classList.remove('hidden-view');
    views[viewName].classList.add('active-view');
  }
}

export function updatePhaseStepper(stepNum, description) {
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`step-node-${i}`);
    if (node) {
      if (i <= stepNum) {
        node.classList.add('active');
      } else {
        node.classList.remove('active');
      }
    }
  }
  const descEl = document.getElementById('proj-phase-description');
  if (descEl && description) {
    descEl.textContent = description;
  }
}
