/* =========================================================
   Inequality Tycoon: Client State Management
   ========================================================= */

export const socket = typeof io !== 'undefined' ? io() : null;

export const state = {
  myPlayer: null,
  currentRoomCode: null,
  isProjector: false,
  soundEnabled: true,
  currentRoom: null,
  lorenzChart: null,
  finalLorenzChart: null
};

export function setMyPlayer(player) {
  state.myPlayer = player;
}

export function setCurrentRoomCode(code) {
  state.currentRoomCode = code;
}

export function setIsProjector(isProj) {
  state.isProjector = isProj;
}

export function setSoundEnabled(enabled) {
  state.soundEnabled = enabled;
}

export function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  return state.soundEnabled;
}

export function setCurrentRoom(room) {
  state.currentRoom = room;
  window._currentRoom = room;
}
