const setupCard = document.getElementById("setupCard");
const scoreCard = document.getElementById("scoreCard");
const teamManageCard = document.getElementById("teamManageCard");
const setupForm = document.getElementById("setupForm");
const recoverMatchBtn = document.getElementById("recoverMatchBtn");
const recoverMatchHint = document.getElementById("recoverMatchHint");

const inputTargetPoints = document.getElementById("targetPoints");
const inputTotalGames = document.getElementById("totalGames");
const inputTeamAName = document.getElementById("teamAName");
const inputTeamBName = document.getElementById("teamBName");

const teamALabel = document.getElementById("teamALabel");
const teamBLabel = document.getElementById("teamBLabel");
const teamAPoints = document.getElementById("teamAPoints");
const teamBPoints = document.getElementById("teamBPoints");
const teamAWins = document.getElementById("teamAWins");
const teamBWins = document.getElementById("teamBWins");
const matchMeta = document.getElementById("matchMeta");
const statusText = document.getElementById("statusText");
const landscapeHint = document.getElementById("landscapeHint");
const undoMeta = document.getElementById("undoMeta");
const toastContainer = document.getElementById("toastContainer");
const availableCardsList = document.getElementById("availableCardsList");
const availableCardsEmpty = document.getElementById("availableCardsEmpty");

const undoBtn = document.getElementById("undoBtn");
const addCardBtn = document.getElementById("addCardBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const resetMatchBtn = document.getElementById("resetMatchBtn");
const swapPromptModal = document.getElementById("swapPromptModal");
const swapPromptContinueBtn = document.getElementById("swapPromptContinueBtn");
const enableComebackDrawRule = document.getElementById("enableComebackDrawRule");
const comebackDrawModal = document.getElementById("comebackDrawModal");
const comebackDrawMsg = document.getElementById("comebackDrawMsg");
const comebackDrawContinueBtn = document.getElementById("comebackDrawContinueBtn");
const drawModal = document.getElementById("drawModal");
const drawDeck = document.getElementById("drawDeck");
const drawResultCard = document.getElementById("drawResultCard");
const drawResultTitle = document.getElementById("drawResultTitle");
const drawResultMeta = document.getElementById("drawResultMeta");
const drawContinueBtn = document.getElementById("drawContinueBtn");

const enableRandomDoubles = document.getElementById("enableRandomDoubles");
const swapPromptDefaultMsg = document.getElementById("swapPromptDefaultMsg");
const swapPromptRotationInfo = document.getElementById("swapPromptRotationInfo");
const rotationPanel = document.getElementById("rotationPanel");
const rotationTeamAName = document.getElementById("rotationTeamAName");
const rotationTeamBName = document.getElementById("rotationTeamBName");
const rotationRoundA = document.getElementById("rotationRoundA");
const rotationRoundB = document.getElementById("rotationRoundB");
const rotationOnCourtA = document.getElementById("rotationOnCourtA");
const rotationOnCourtB = document.getElementById("rotationOnCourtB");
const rotationOrderA = document.getElementById("rotationOrderA");
const rotationOrderB = document.getElementById("rotationOrderB");

const swapCardModal = document.getElementById("swapCardModal");
const swapCardSelfBtn = document.getElementById("swapCardSelfBtn");
const swapCardOppBtn = document.getElementById("swapCardOppBtn");
const swapCardOffOptions = document.getElementById("swapCardOffOptions");
const swapCardOnOptions = document.getElementById("swapCardOnOptions");
const swapCardConfirmBtn = document.getElementById("swapCardConfirmBtn");
const swapCardCancelBtn = document.getElementById("swapCardCancelBtn");

let state = null;
let recoverySnapshot = null;
let pendingDraw = null;
let drawRevealTimer = null;
let pendingComebackDraw = null;
let pendingSwapCard = null;
const undoHistory = [];
const maxUndoSteps = 5;
const landscapeModeQuery = window.matchMedia("(orientation: landscape) and (max-height: 560px) and (max-width: 980px)");

function cloneRotationTeam(rot) {
  if (!rot) {
    return null;
  }
  return {
    round: rot.round,
    onCourt: [...rot.onCourt],
    upcoming: [...rot.upcoming],
    playedThisRound: [...rot.playedThisRound]
  };
}

function cloneState(source) {
  return {
    config: {
      ...source.config,
      cards: source.config.cards.map((c) => ({ ...c })),
      rosters: source.config.rosters
        ? { A: [...source.config.rosters.A], B: [...source.config.rosters.B] }
        : null
    },
    currentGame: source.currentGame,
    points: { ...source.points },
    wins: { ...source.wins },
    gameLocked: source.gameLocked,
    matchEnded: source.matchEnded,
    pendingSwapPrompts: source.pendingSwapPrompts ?? 0,
    lastSwapMilestone: {
      A: source.lastSwapMilestone?.A ?? 0,
      B: source.lastSwapMilestone?.B ?? 0
    },
    comebackDrawTriggered: source.comebackDrawTriggered ?? false,
    totalPointsScored: source.totalPointsScored,
    drawsLeft: { ...source.drawsLeft },
    activeCard: {
      A: source.activeCard.A ? { ...source.activeCard.A } : null,
      B: source.activeCard.B ? { ...source.activeCard.B } : null
    },
    rotation: source.rotation
      ? { A: cloneRotationTeam(source.rotation.A), B: cloneRotationTeam(source.rotation.B) }
      : null
  };
}

function cloneUndoHistory(source) {
  return source.map((snapshot) => cloneState(snapshot));
}

function isSwapPromptVisible() {
  return Boolean(swapPromptModal) && !swapPromptModal.classList.contains("hidden");
}

function isDrawModalVisible() {
  return Boolean(drawModal) && !drawModal.classList.contains("hidden");
}

function isComebackDrawVisible() {
  return Boolean(comebackDrawModal) && !comebackDrawModal.classList.contains("hidden");
}

function isSwapCardModalVisible() {
  return Boolean(swapCardModal) && !swapCardModal.classList.contains("hidden");
}

function isBlockingOverlayVisible() {
  return isSwapPromptVisible() || isDrawModalVisible() || isComebackDrawVisible() || isSwapCardModalVisible();
}

function showSwapPrompt() {
  if (!swapPromptModal) {
    return;
  }
  updateSwapPromptContent();
  swapPromptModal.classList.remove("hidden");
}

function hideSwapPrompt() {
  if (!swapPromptModal) {
    return;
  }
  swapPromptModal.classList.add("hidden");
}

function showComebackDrawModal(team) {
  if (!comebackDrawModal || !comebackDrawMsg || !state) {
    return;
  }

  const teamName = team === "A" ? state.config.teamAName : state.config.teamBName;
  const otherTeam = team === "A" ? "B" : "A";
  comebackDrawMsg.textContent = `关键时刻！${teamName} 因为落后超过10分获得一次额外抽卡机会！`;
  comebackDrawModal.classList.remove("hidden");
}

function hideComebackDrawModal() {
  if (!comebackDrawModal) {
    return;
  }
  comebackDrawModal.classList.add("hidden");
}

function checkComebackDrawRule() {
  if (!state || state.comebackDrawTriggered || state.gameLocked || state.matchEnded || !state.config.enableComebackDrawRule) {
    return;
  }

  const targetPts = state.config.targetPoints;
  const ptsA = state.points.A;
  const ptsB = state.points.B;
  const diffToWinA = targetPts - ptsA;
  const diffToWinB = targetPts - ptsB;

  let triggerTeam = null;
  // A队分数为 targetPoints - 10（差10分），B队分差≤10分 -> 给B队（落后队）抽卡
  if (ptsA === targetPts - 10 && ptsB < ptsA && (ptsA - ptsB) >= 10) {
    triggerTeam = "B";
  }
  // B队分数为 targetPoints - 10（差10分），A队分差≤10分 -> 给A队（落后队）抽卡
  else if (ptsB === targetPts - 10 && ptsA < ptsB && (ptsB - ptsA) >= 10) {
    triggerTeam = "A";
  }

  if (triggerTeam) {
    state.comebackDrawTriggered = true;
    state.drawsLeft[triggerTeam] += 1;
    pendingComebackDraw = triggerTeam;
    showComebackDrawModal(triggerTeam);
  }
}

function clearDrawRevealTimer() {
  if (drawRevealTimer) {
    clearTimeout(drawRevealTimer);
    drawRevealTimer = null;
  }
}

function hideDrawModal() {
  if (!drawModal) {
    return;
  }

  clearDrawRevealTimer();
  drawModal.classList.add("hidden");

  if (drawDeck) {
    drawDeck.innerHTML = "";
  }

  if (drawResultCard) {
    drawResultCard.classList.add("hidden");
  }

  if (drawContinueBtn) {
    drawContinueBtn.disabled = true;
  }
}

function cardDisplayName(card) {
  const text = String(card?.text || "").trim();
  if (!text) {
    return "神秘卡";
  }

  const title = text.split("：")[0].trim();
  return title || text;
}

function showDrawModal(team, selectedIndex) {
  if (!drawModal || !drawDeck || !drawResultCard || !drawResultTitle || !drawResultMeta || !drawContinueBtn || !state || !pendingDraw) {
    return;
  }

  clearDrawRevealTimer();
  drawDeck.innerHTML = "";
  drawResultCard.classList.add("hidden");
  drawContinueBtn.disabled = true;

  const teamName = team === "A" ? state.config.teamAName : state.config.teamBName;
  const pool = state.config.cards || [];

  pool.forEach((card, idx) => {
    const cardNode = document.createElement("div");
    cardNode.className = "draw-anim-card";
    cardNode.dataset.index = String(idx);
    cardNode.style.setProperty("--dx", `${Math.floor(Math.random() * 40) - 20}px`);
    cardNode.style.setProperty("--dy", `${Math.floor(Math.random() * 24) - 12}px`);
    cardNode.style.setProperty("--rot", `${Math.floor(Math.random() * 26) - 13}deg`);
    cardNode.textContent = `${cardDisplayName(card)}`;
    drawDeck.appendChild(cardNode);
  });

  drawModal.classList.remove("hidden");

  drawRevealTimer = setTimeout(() => {
    const selectedCardNode = drawDeck.querySelector(`.draw-anim-card[data-index="${selectedIndex}"]`);
    if (selectedCardNode) {
      selectedCardNode.classList.add("selected");
    }

    const selectedCard = pendingDraw.card;
    const isRdSwapCard = state.config.enableRandomDoubles && state.rotation && isSwapCard(selectedCard);
    const bonusText = selectedCard.bonusPoints > 0 ? `，自己 +${selectedCard.bonusPoints} 分` : "";
    drawResultTitle.textContent = `「${teamName}」抽到：${cardDisplayName(selectedCard)}`;
    drawResultMeta.textContent = isRdSwapCard
      ? `${selectedCard.text}（点击继续后选择换人）`
      : `${selectedCard.text}（持续 ${selectedCard.durationBalls} 球${bonusText}）`;
    drawResultCard.classList.remove("hidden");
    drawContinueBtn.disabled = false;
  }, 700);
}

function commitDrawResult() {
  if (!state || !pendingDraw) {
    hideDrawModal();
    pendingDraw = null;
    return;
  }

  const { team, card } = pendingDraw;
  if (state.matchEnded || state.gameLocked || state.drawsLeft[team] <= 0 || state.activeCard[team]) {
    hideDrawModal();
    pendingDraw = null;
    render();
    return;
  }

  // 换人卡 in random doubles: spend the draw, then open the special substitution chooser
  // instead of applying a timed card effect.
  if (state.config.enableRandomDoubles && state.rotation && isSwapCard(card)) {
    state.drawsLeft[team] -= 1;
    hideDrawModal();
    pendingDraw = null;
    openSwapCardChooser(team);
    render();
    return;
  }

  state.activeCard[team] = {
    text: card.text,
    durationBalls: card.durationBalls,
    bonusPoints: card.bonusPoints,
    drawnAtTotal: state.totalPointsScored
  };
  state.drawsLeft[team] -= 1;

  const teamName = team === "A" ? state.config.teamAName : state.config.teamBName;
  showToast(`「${teamName}」抽到条款：${card.text}（持续 ${card.durationBalls} 球，自己 +${card.bonusPoints} 分）`);

  hideDrawModal();
  pendingDraw = null;
  render();
}

function syncSwapPromptVisibility() {
  if (!state || state.pendingSwapPrompts <= 0) {
    hideSwapPrompt();
    return;
  }
  showSwapPrompt();
}

function acknowledgeSwapPrompt() {
  if (!state || state.pendingSwapPrompts <= 0) {
    hideSwapPrompt();
    return;
  }

  state.pendingSwapPrompts = Math.max(0, state.pendingSwapPrompts - 1);
  syncSwapPromptVisibility();
}

function checkSwapPromptTrigger() {
  if (!state || state.gameLocked) {
    return;
  }

  let newMilestones = 0;
  for (const team of ["A", "B"]) {
    const reachedMilestone = Math.floor(state.points[team] / 10);
    const lastMilestone = state.lastSwapMilestone[team];
    if (reachedMilestone > lastMilestone) {
      newMilestones += reachedMilestone - lastMilestone;
      state.lastSwapMilestone[team] = reachedMilestone;
    }
  }

  if (newMilestones > 0) {
    state.pendingSwapPrompts += newMilestones;
    // Random doubles: each 10-point milestone substitutes one player on each team.
    if (state.config.enableRandomDoubles && state.rotation) {
      for (let i = 0; i < newMilestones; i += 1) {
        rotateTeam(state.rotation.A, state.config.rosters.A);
        rotateTeam(state.rotation.B, state.config.rosters.B);
      }
    }
  }

  syncSwapPromptVisibility();
}

function refreshRecoveryAvailability() {
  if (!recoverMatchBtn) {
    return;
  }

  const hasRecovery = Boolean(recoverySnapshot);
  const hasOngoingRecovery = hasRecovery && !recoverySnapshot.state.matchEnded;

  if (recoverMatchHint) {
    recoverMatchHint.classList.toggle("hidden", !hasOngoingRecovery);
  }

  recoverMatchBtn.classList.toggle("hidden", !hasRecovery);
  recoverMatchBtn.disabled = !hasRecovery;
}

function pushUndoSnapshot() {
  if (!state) {
    return;
  }

  undoHistory.push(cloneState(state));
  if (undoHistory.length > maxUndoSteps) {
    undoHistory.shift();
  }
}

function undoLastStep() {
  if (!state || undoHistory.length === 0 || isSwapPromptVisible()) {
    return;
  }

  const previous = undoHistory.pop();
  state = previous;
  pendingDraw = null;
  hideDrawModal();
  hideComebackDrawModal();
  pendingComebackDraw = null;
  hideSwapCardModal();
  pendingSwapCard = null;
  syncSwapPromptVisibility();
  render();
  refreshLandscapeMode();
}

function restoreRecoveredMatch() {
  if (!recoverySnapshot) {
    return;
  }

  state = cloneState(recoverySnapshot.state);
  undoHistory.length = 0;
  cloneUndoHistory(recoverySnapshot.undoHistory)
    .slice(-maxUndoSteps)
    .forEach((snapshot) => undoHistory.push(snapshot));

  recoverySnapshot = null;
  refreshRecoveryAvailability();

  teamALabel.textContent = state.config.teamAName;
  teamBLabel.textContent = state.config.teamBName;

  setupCard.classList.add("hidden");
  teamManageCard.classList.add("hidden");
  scoreCard.classList.remove("hidden");
  syncSwapPromptVisibility();
  hideDrawModal();
  pendingDraw = null;
  hideSwapCardModal();
  pendingSwapCard = null;

  renderTeamRosterLines();
  render();
  refreshLandscapeMode();
}

function refreshLandscapeMode() {
  const isActiveMatch = Boolean(state);
  const enableLandscapeMode = isActiveMatch && landscapeModeQuery.matches;

  document.body.classList.toggle("landscape-score-mode", enableLandscapeMode);
  document.body.classList.toggle("match-active", isActiveMatch);

  if (landscapeHint) {
    landscapeHint.classList.toggle("hidden", !enableLandscapeMode);
  }
}

const DEFAULT_CARDS = [
  { text: "爆分卡：我方赢一球得两分", durationBalls: 5, bonusPoints: 1 },
  { text: "软绵绵卡：对方不能杀球，软压也不行", durationBalls: 5, bonusPoints: 0 },
  { text: "连续发球卡：无论上一轮哪方得分，我方连续发球", durationBalls: 5, bonusPoints: 0 },
  { text: "加人卡：我方任意选择加1人上场，3打2", durationBalls: 5, bonusPoints: 0 },
  { text: "换人卡：本队可强制执行一次特殊换人（不受10分限制），提供两个换人选项：1）本队换任意一名球员上场；2）指定换下对方队任意一名球员", durationBalls: 1, bonusPoints: 0 },
  { text: "发后场封印卡：对方发球只能发前场，不能发后场", durationBalls: 5, bonusPoints: 0 },
  { text: "发前场封印卡：对方发球只能发后场，不能发前场", durationBalls: 5, bonusPoints: 0 },
  { text: "明牌卡：对方击球前必须大声说出球路（高远/杀/吊/放/勾/扑/抽/挡），被抽或杀球时除外", durationBalls: 5, bonusPoints: 0 },
  { text: "空门卡：对方打来的球落在我方前场发球线之前，对方不得分", durationBalls: 5, bonusPoints: 0 },
  { text: "空城卡：对方打来的球落在我方双打后场发球线之后，对方不得分", durationBalls: 5, bonusPoints: 0 },
  { text: "反手卡：双方全程只能使用反手", durationBalls: 5, bonusPoints: 0 },
  { text: "换手卡：双方全程只能使用非惯用手", durationBalls: 5, bonusPoints: 0 }
];

function sanitizeName(name, fallback) {
  const trimmed = String(name || "").trim();
  return trimmed || fallback;
}

function gamesToWin(totalGames) {
  return Math.floor(totalGames / 2) + 1;
}

function collectCards() {
  const entries = document.querySelectorAll(".card-entry");
  const cards = [];
  entries.forEach((entry) => {
    const text = entry.querySelector(".card-text-input").value.trim();
    const durationBalls = Number.parseInt(entry.querySelector(".card-duration-input").value, 10);
    const bonusPoints = Number.parseInt(entry.querySelector(".card-bonus-input").value, 10);
    if (text && Number.isFinite(durationBalls) && durationBalls > 0 && Number.isFinite(bonusPoints) && bonusPoints >= 0) {
      cards.push({ text, durationBalls, bonusPoints });
    }
  });
  return cards;
}

function addCardEntry(preset = {}) {
  const cardsList = document.getElementById("cardsList");
  const noHint = cardsList.querySelector(".no-cards-hint");
  if (noHint) {
    noHint.remove();
  }

  const textVal = preset.text ?? "";
  const escapedText = textVal
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const durationVal = preset.durationBalls ?? 5;
  const bonusVal = preset.bonusPoints ?? 0;

  const entry = document.createElement("div");
  entry.className = "card-entry";
  entry.innerHTML = [
    `<textarea class="card-text-input" placeholder="条款内容（如：下一球必须用反手）" maxlength="80" rows="2">${escapedText}</textarea>`,
    '<div class="card-entry-meta">',
    `  <span class="card-duration-wrap">持续 <input type="number" class="card-duration-input" min="1" max="999" value="${durationVal}"> 球</span>`,
    `  <span class="card-bonus-wrap">加 <input type="number" class="card-bonus-input" min="0" max="99" value="${bonusVal}"> 分</span>`,
    '  <button type="button" class="btn tertiary compact card-remove-btn" aria-label="删除">✕</button>',
    '</div>'
  ].join("");

  entry.querySelector(".card-remove-btn").addEventListener("click", () => {
    entry.remove();
    if (cardsList.querySelectorAll(".card-entry").length === 0) {
      const hint = document.createElement("p");
      hint.className = "no-cards-hint";
      hint.textContent = "暂无条款，点击「添加条款」开始设置";
      cardsList.appendChild(hint);
    }
  });

  cardsList.appendChild(entry);
}

function checkCardExpiry() {
  if (!state) {
    return;
  }

  for (const team of ["A", "B"]) {
    const card = state.activeCard[team];
    if (!card) {
      continue;
    }

    const elapsed = state.totalPointsScored - card.drawnAtTotal;
    if (elapsed >= card.durationBalls) {
      state.activeCard[team] = null;
      const teamName = team === "A" ? state.config.teamAName : state.config.teamBName;
      showToast(`「${teamName}」的条款「${card.text}」已失效`);
    }
  }
}

function drawCard(team) {
  if (!state || state.matchEnded || state.gameLocked || isBlockingOverlayVisible()) {
    return;
  }

  if (state.activeCard[team]) {
    return;
  }

  if (state.drawsLeft[team] <= 0) {
    return;
  }

  const pool = state.config.cards;
  if (!pool || pool.length === 0) {
    return;
  }

  pushUndoSnapshot();

  const selectedIndex = Math.floor(Math.random() * pool.length);
  const card = pool[selectedIndex];
  pendingDraw = {
    team,
    card: { ...card }
  };

  showDrawModal(team, selectedIndex);
}

function showToast(msg) {
  if (!toastContainer) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function renderAvailableCards() {
  if (!state || !availableCardsList || !availableCardsEmpty) {
    return;
  }

  const cards = state.config.cards || [];
  availableCardsList.innerHTML = "";
  availableCardsEmpty.classList.toggle("hidden", cards.length > 0);

  cards.forEach((card, index) => {
    const li = document.createElement("li");
    const bonusText = card.bonusPoints > 0 ? `，自己 +${card.bonusPoints} 分` : "";
    li.textContent = `${index + 1}. ${card.text}（持续 ${card.durationBalls} 球${bonusText}）`;
    availableCardsList.appendChild(li);
  });
}

function startMatch(config) {
  recoverySnapshot = null;
  refreshRecoveryAvailability();
  undoHistory.length = 0;
  state = {
    config,
    currentGame: 1,
    points: { A: 0, B: 0 },
    wins: { A: 0, B: 0 },
    gameLocked: false,
    matchEnded: false,
    pendingSwapPrompts: 0,
    lastSwapMilestone: { A: 0, B: 0 },
    comebackDrawTriggered: false,
    totalPointsScored: 0,
    drawsLeft: { A: config.drawsPerTeam, B: config.drawsPerTeam },
    activeCard: { A: null, B: null },
    rotation:
      config.enableRandomDoubles && config.rosters
        ? { A: initRotation(config.rosters.A), B: initRotation(config.rosters.B) }
        : null
  };

  teamALabel.textContent = config.teamAName;
  teamBLabel.textContent = config.teamBName;

  setupCard.classList.add("hidden");
  teamManageCard.classList.add("hidden");
  scoreCard.classList.remove("hidden");
  syncSwapPromptVisibility();
  hideDrawModal();
  pendingDraw = null;
  hideSwapCardModal();
  pendingSwapCard = null;

  renderTeamRosterLines();
  render();
  refreshLandscapeMode();
}

function render() {
  if (!state) {
    return;
  }

  renderAvailableCards();

  teamAPoints.textContent = String(state.points.A);
  teamBPoints.textContent = String(state.points.B);
  teamAWins.textContent = String(state.wins.A);
  teamBWins.textContent = String(state.wins.B);

  const needWins = gamesToWin(state.config.totalGames);
  matchMeta.textContent = `第 ${state.currentGame} / ${state.config.totalGames} 局 · 每局 ${state.config.targetPoints} 分 · 先赢 ${needWins} 局获胜`;

  if (state.matchEnded) {
    statusText.classList.add("alert");
    const champ = state.wins.A > state.wins.B ? state.config.teamAName : state.config.teamBName;
    statusText.textContent = `比赛结束：${champ} 获胜`;
  } else if (state.gameLocked) {
    statusText.classList.remove("alert");
    statusText.textContent = "本局已结束，请开始下一局";
  } else if (state.points.A >= state.config.targetPoints && state.points.B >= state.config.targetPoints) {
    statusText.classList.remove("alert");
    statusText.textContent = "加分阶段：需领先 2 分才能赢下本局";
  } else {
    statusText.classList.remove("alert");
    statusText.textContent = "比赛进行中";
  }

  newRoundBtn.disabled = !state.gameLocked || state.matchEnded;
  undoBtn.disabled = undoHistory.length === 0;

  if (undoMeta) {
    undoMeta.textContent = `回撤步数：${undoHistory.length} / ${maxUndoSteps}`;
  }

  document.querySelectorAll(".score-btn").forEach((btn) => {
    btn.disabled = state.gameLocked || state.matchEnded;
  });

  for (const team of ["A", "B"]) {
    const drawBtn = document.getElementById(`drawBtn${team}`);
    const cardWrap = document.getElementById(`team${team}CardWrap`);
    const cardText = document.getElementById(`team${team}CardText`);
    const cardTimer = document.getElementById(`team${team}CardTimer`);
    const scoreBtn = document.querySelector(`.score-btn[data-team="${team}"]`);
    const activeCard = state.activeCard[team];

    if (drawBtn) {
      const hasCards = state.config.cards.length > 0;
      const canDraw =
        hasCards &&
        state.drawsLeft[team] > 0 &&
        !state.activeCard[team] &&
        !state.gameLocked &&
        !state.matchEnded;
      drawBtn.disabled = !canDraw;
      drawBtn.textContent =
        state.drawsLeft[team] > 0
          ? `抽卡（剩 ${state.drawsLeft[team]} 次）`
          : "抽卡（已用完）";
      const showDraw = state.config.drawsPerTeam > 0 && hasCards;
      drawBtn.classList.toggle("hidden", !showDraw);
    }

    if (scoreBtn) {
      const bonus = activeCard ? activeCard.bonusPoints : 0;
      const totalPoints = 1 + bonus;
      scoreBtn.textContent = `+${totalPoints} 分`;
    }

    if (cardWrap && cardText && cardTimer) {
      if (activeCard) {
        const elapsed = state.totalPointsScored - activeCard.drawnAtTotal;
        const remaining = Math.max(0, activeCard.durationBalls - elapsed);
        cardText.textContent =
          activeCard.bonusPoints > 0
            ? `${activeCard.text}（自己 +${activeCard.bonusPoints} 分）`
            : activeCard.text;
        cardTimer.textContent = `还剩 ${remaining} 球`;
        cardWrap.classList.remove("hidden");
      } else {
        cardWrap.classList.add("hidden");
      }
    }
  }

  renderTeamRosterLines();
  renderRotationPanel();
}

function checkRoundWinner() {
  if (!state || state.gameLocked || state.matchEnded) {
    return;
  }

  const target = state.config.targetPoints;
  if (state.points.A < target && state.points.B < target) {
    return;
  }

  const diff = Math.abs(state.points.A - state.points.B);
  if (diff < 2) {
    return;
  }

  const winner = state.points.A > state.points.B ? "A" : "B";
  state.wins[winner] += 1;
  state.gameLocked = true;

  const winnerName = winner === "A" ? state.config.teamAName : state.config.teamBName;
  const needWins = gamesToWin(state.config.totalGames);

  if (state.wins[winner] >= needWins || state.currentGame >= state.config.totalGames) {
    state.matchEnded = true;
    statusText.classList.add("alert");
    statusText.textContent = `本局胜者：${winnerName}。比赛结束。`;
  } else {
    statusText.classList.remove("alert");
    statusText.textContent = `本局胜者：${winnerName}`;
  }
}

function updatePoints(team, delta) {
  if (!state || state.gameLocked || state.matchEnded || isBlockingOverlayVisible()) {
    return;
  }

  pushUndoSnapshot();

  const next = state.points[team] + delta;
  state.points[team] = Math.max(0, next);

  if (delta > 0) {
    state.totalPointsScored += 1;
    checkCardExpiry();
  }

  checkRoundWinner();
  checkSwapPromptTrigger();
  checkComebackDrawRule();
  render();
}

function getScoreDelta(team) {
  const activeCard = state?.activeCard?.[team];
  return 1 + (activeCard ? activeCard.bonusPoints : 0);
}

function startNextRound() {
  if (!state || !state.gameLocked || state.matchEnded || isBlockingOverlayVisible()) {
    return;
  }

  pushUndoSnapshot();

  state.currentGame += 1;
  state.points.A = 0;
  state.points.B = 0;
  state.gameLocked = false;
  state.pendingSwapPrompts = 0;
  state.lastSwapMilestone.A = 0;
  state.lastSwapMilestone.B = 0;
  state.comebackDrawTriggered = false;
  state.drawsLeft.A = state.config.drawsPerTeam;
  state.drawsLeft.B = state.config.drawsPerTeam;
  state.activeCard.A = null;
  state.activeCard.B = null;

  if (state.config.enableRandomDoubles && state.config.rosters) {
    state.rotation = {
      A: initRotation(state.config.rosters.A),
      B: initRotation(state.config.rosters.B)
    };
  }

  syncSwapPromptVisibility();
  hideComebackDrawModal();
  pendingComebackDraw = null;
  render();
}

function resetMatch() {
  if (isBlockingOverlayVisible()) {
    return;
  }

  if (state) {
    recoverySnapshot = {
      state: cloneState(state),
      undoHistory: cloneUndoHistory(undoHistory)
    };
  }

  state = null;
  undoHistory.length = 0;
  setupCard.classList.remove("hidden");
  teamManageCard.classList.remove("hidden");
  scoreCard.classList.add("hidden");
  setupForm.reset();

  inputTargetPoints.value = "101";
  inputTotalGames.value = "3";
  inputTeamAName.value = "蓝队";
  inputTeamBName.value = "红队";
  document.getElementById("drawsPerTeam").value = "10";

  if (undoMeta) {
    undoMeta.textContent = `回撤步数：0 / ${maxUndoSteps}`;
  }
  undoBtn.disabled = true;

  refreshRecoveryAvailability();
  syncSwapPromptVisibility();
  hideDrawModal();
  hideComebackDrawModal();
  hideSwapCardModal();
  pendingDraw = null;
  pendingComebackDraw = null;
  pendingSwapCard = null;

  refreshLandscapeMode();
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const targetPoints = Number.parseInt(inputTargetPoints.value, 10);
  const totalGames = Number.parseInt(inputTotalGames.value, 10);

  if (!Number.isFinite(targetPoints) || targetPoints <= 0) {
    inputTargetPoints.focus();
    return;
  }

  if (!Number.isFinite(totalGames) || totalGames <= 0) {
    inputTotalGames.focus();
    return;
  }

  const rawDraws = Number.parseInt(document.getElementById("drawsPerTeam").value, 10);
  const drawsPerTeam = Number.isFinite(rawDraws) && rawDraws >= 0 ? rawDraws : 0;
  const ruleEnabled = enableComebackDrawRule ? enableComebackDrawRule.checked : false;
  const randomDoubles = enableRandomDoubles ? enableRandomDoubles.checked : false;
  const rosters = getAssignedRosters();

  if (randomDoubles && (rosters.A.length < 2 || rosters.B.length < 2)) {
    showToast("随机双打模式需要先完成分组，且每队至少 2 名上场队员");
    teamManageCard.classList.remove("hidden");
    teamManageCard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const config = {
    targetPoints,
    totalGames,
    teamAName: sanitizeName(inputTeamAName.value, "蓝队"),
    teamBName: sanitizeName(inputTeamBName.value, "红队"),
    drawsPerTeam,
    enableComebackDrawRule: ruleEnabled,
    enableRandomDoubles: randomDoubles,
    cards: collectCards(),
    rosters
  };

  startMatch(config);
});

document.querySelectorAll(".score-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const team = btn.getAttribute("data-team");

    if (team !== "A" && team !== "B") {
      return;
    }

    updatePoints(team, getScoreDelta(team));
  });
});

undoBtn.addEventListener("click", undoLastStep);
recoverMatchBtn.addEventListener("click", restoreRecoveredMatch);

document.querySelectorAll(".draw-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const team = btn.getAttribute("data-team");
    if (team === "A" || team === "B") {
      drawCard(team);
    }
  });
});

if (addCardBtn) {
  addCardBtn.addEventListener("click", () => addCardEntry());
}

DEFAULT_CARDS.forEach((card) => addCardEntry(card));
newRoundBtn.addEventListener("click", startNextRound);
resetMatchBtn.addEventListener("click", resetMatch);

if (swapPromptContinueBtn) {
  swapPromptContinueBtn.addEventListener("click", acknowledgeSwapPrompt);
}

if (comebackDrawContinueBtn) {
  comebackDrawContinueBtn.addEventListener("click", () => {
    hideComebackDrawModal();
    pendingComebackDraw = null;
    render();
  });
}

if (drawContinueBtn) {
  drawContinueBtn.addEventListener("click", commitDrawResult);
}

if (swapCardSelfBtn) {
  swapCardSelfBtn.addEventListener("click", () => selectSwapTarget("self"));
}
if (swapCardOppBtn) {
  swapCardOppBtn.addEventListener("click", () => selectSwapTarget("opp"));
}
if (swapCardConfirmBtn) {
  swapCardConfirmBtn.addEventListener("click", confirmSwapCard);
}
if (swapCardCancelBtn) {
  swapCardCancelBtn.addEventListener("click", cancelSwapCard);
}

if (typeof landscapeModeQuery.addEventListener === "function") {
  landscapeModeQuery.addEventListener("change", refreshLandscapeMode);
} else if (typeof landscapeModeQuery.addListener === "function") {
  landscapeModeQuery.addListener(refreshLandscapeMode);
}

// Safety guard: never persist scoring state outside memory.
window.addEventListener("beforeunload", () => {
  state = null;
  recoverySnapshot = null;
  pendingDraw = null;
  pendingComebackDraw = null;
  pendingSwapCard = null;
  clearDrawRevealTimer();
});

// ============================
// Team Management / Random Grouping
// ============================
const maleNameInput = document.getElementById("maleNameInput");
const femaleNameInput = document.getElementById("femaleNameInput");
const addMaleBtn = document.getElementById("addMaleBtn");
const addFemaleBtn = document.getElementById("addFemaleBtn");
const malePlayerList = document.getElementById("malePlayerList");
const femalePlayerList = document.getElementById("femalePlayerList");
const maleCount = document.getElementById("maleCount");
const femaleCount = document.getElementById("femaleCount");
const assignOneBtn = document.getElementById("assignOneBtn");
const assignAllBtn = document.getElementById("assignAllBtn");
const resetGroupingBtn = document.getElementById("resetGroupingBtn");
const groupingStatus = document.getElementById("groupingStatus");
const groupTeamALabel = document.getElementById("groupTeamALabel");
const groupTeamBLabel = document.getElementById("groupTeamBLabel");
const teamARosterList = document.getElementById("teamARosterList");
const teamBRosterList = document.getElementById("teamBRosterList");
const teamARosterLine = document.getElementById("teamARosterLine");
const teamBRosterLine = document.getElementById("teamBRosterLine");

let playerSeq = 0;
// Each player: { id, name, gender: "male"|"female", team: "A"|"B"|null }
const players = [];
// Alternation pointer used only as a tie-breaker when both teams are balanced.
let groupingTurn = "A";

function addPlayer(gender, rawName) {
  const name = String(rawName || "").trim();
  if (!name) {
    return;
  }

  playerSeq += 1;
  players.push({ id: playerSeq, name, gender, team: null });
  renderGrouping();
}

function removePlayer(id) {
  const index = players.findIndex((p) => p.id === id);
  if (index === -1) {
    return;
  }
  players.splice(index, 1);
  renderGrouping();
}

function resetGrouping() {
  players.forEach((p) => {
    p.team = null;
  });
  groupingTurn = "A";
  renderGrouping();
}

function countByTeam(team, gender) {
  return players.filter((p) => p.team === team && p.gender === gender).length;
}

function countTeam(team) {
  return players.filter((p) => p.team === team).length;
}

// Pick the team that keeps gender (then overall) counts as balanced as possible.
function chooseTeam(gender) {
  const aGender = countByTeam("A", gender);
  const bGender = countByTeam("B", gender);
  if (aGender !== bGender) {
    return aGender < bGender ? "A" : "B";
  }

  const aTotal = countTeam("A");
  const bTotal = countTeam("B");
  if (aTotal !== bTotal) {
    return aTotal < bTotal ? "A" : "B";
  }

  return groupingTurn;
}

// Assign one random unassigned player to a balanced team. Returns false when none remain.
function assignOnePlayer() {
  // Draw males first, then females ("按性别分别依次抽选").
  let pool = players.filter((p) => p.team === null && p.gender === "male");
  if (pool.length === 0) {
    pool = players.filter((p) => p.team === null && p.gender === "female");
  }
  if (pool.length === 0) {
    return false;
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  const team = chooseTeam(picked.gender);
  picked.team = team;
  groupingTurn = team === "A" ? "B" : "A";

  return true;
}

function assignNextPlayer() {
  if (assignOnePlayer()) {
    renderGrouping();
  }
}

function assignAllPlayers() {
  let changed = false;
  while (assignOnePlayer()) {
    changed = true;
  }
  if (changed) {
    renderGrouping();
  }
}

function getAssignedRosters() {
  return {
    A: players.filter((p) => p.team === "A").map((p) => p.name),
    B: players.filter((p) => p.team === "B").map((p) => p.name)
  };
}

function renderPool(listEl, gender) {
  listEl.innerHTML = "";
  players
    .filter((p) => p.gender === gender)
    .forEach((player) => {
      const li = document.createElement("li");
      li.className = "player-pool-item";
      if (player.team) {
        li.classList.add("assigned", player.team === "A" ? "to-a" : "to-b");
      }

      const nameSpan = document.createElement("span");
      nameSpan.className = "player-name";
      nameSpan.textContent = player.name;

      const tag = document.createElement("span");
      tag.className = "player-team-tag";
      tag.textContent = player.team ? (player.team === "A" ? "蓝" : "红") : "";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "player-remove-btn";
      removeBtn.setAttribute("aria-label", "删除");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => removePlayer(player.id));

      li.append(nameSpan, tag, removeBtn);
      listEl.appendChild(li);
    });
}

function renderGroupedRoster(listEl, team) {
  listEl.innerHTML = "";
  const members = players.filter((p) => p.team === team);
  if (members.length === 0) {
    const li = document.createElement("li");
    li.className = "grouped-roster-empty";
    li.textContent = "暂无队员";
    listEl.appendChild(li);
    return;
  }

  members.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = `${player.name}（${player.gender === "male" ? "男" : "女"}）`;
    listEl.appendChild(li);
  });
}

function renderGrouping() {
  const teamAName = sanitizeName(inputTeamAName.value, "蓝队");
  const teamBName = sanitizeName(inputTeamBName.value, "红队");
  groupTeamALabel.textContent = teamAName;
  groupTeamBLabel.textContent = teamBName;

  maleCount.textContent = String(players.filter((p) => p.gender === "male").length);
  femaleCount.textContent = String(players.filter((p) => p.gender === "female").length);

  renderPool(malePlayerList, "male");
  renderPool(femalePlayerList, "female");
  renderGroupedRoster(teamARosterList, "A");
  renderGroupedRoster(teamBRosterList, "B");

  const total = players.length;
  const unassigned = players.filter((p) => p.team === null).length;
  const assigned = total - unassigned;

  assignOneBtn.disabled = unassigned === 0;
  assignAllBtn.disabled = unassigned === 0;
  resetGroupingBtn.disabled = assigned === 0;

  if (total === 0) {
    groupingStatus.textContent = "请先录入队员，再开始随机分组。";
  } else if (unassigned > 0) {
    groupingStatus.textContent = `已分配 ${assigned} / ${total} 人，剩余 ${unassigned} 人待分配。`;
  } else {
    const a = countTeam("A");
    const b = countTeam("B");
    groupingStatus.textContent = `分配完成：${teamAName} ${a} 人 · ${teamBName} ${b} 人，可开始比赛。`;
  }
}

// Show the assigned rosters (or the current on-court pair) inside the score panels.
function renderTeamRosterLines() {
  const rosters = state && state.config ? state.config.rosters : null;
  const rotation = state ? state.rotation : null;
  const randomDoubles = Boolean(state && state.config && state.config.enableRandomDoubles && rotation);

  const lines = {
    A: { el: teamARosterLine, names: rosters && rosters.A ? rosters.A : [] },
    B: { el: teamBRosterLine, names: rosters && rosters.B ? rosters.B : [] }
  };

  for (const team of ["A", "B"]) {
    const { el, names } = lines[team];
    if (!el) {
      continue;
    }
    if (randomDoubles && rotation[team]) {
      el.textContent = `上场：${rotation[team].onCourt.join("、")}`;
      el.classList.remove("hidden");
    } else {
      el.textContent = names.join("、");
      el.classList.toggle("hidden", names.length === 0);
    }
  }
}

// ============================
// Random Doubles Rotation
// ============================
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Build a fresh rotation: 2 random players on court, the rest queued as this round's order.
function initRotation(teamPlayers) {
  const shuffled = shuffleArray(teamPlayers);
  return {
    round: 1,
    onCourt: shuffled.slice(0, 2),
    upcoming: shuffled.slice(2),
    playedThisRound: shuffled.slice(0, 2)
  };
}

// When this round's queue is empty, open the next round: reshuffle everyone not on court.
function ensureRotationRound(rot, teamPlayers) {
  if (teamPlayers.length > 2 && rot.upcoming.length === 0) {
    rot.round += 1;
    rot.upcoming = shuffleArray(teamPlayers.filter((p) => !rot.onCourt.includes(p)));
    rot.playedThisRound = [...rot.onCourt];
  }
}

// Substitute one player: oldest on court leaves, next in this round's queue comes on.
function rotateTeam(rot, teamPlayers) {
  if (!rot || teamPlayers.length <= 2 || rot.upcoming.length === 0) {
    return;
  }

  const onPlayer = rot.upcoming.shift();
  rot.onCourt.shift();
  rot.onCourt.push(onPlayer);
  if (!rot.playedThisRound.includes(onPlayer)) {
    rot.playedThisRound.push(onPlayer);
  }

  ensureRotationRound(rot, teamPlayers);
}

// 换人卡: force a special substitution on `targetTeam` (not bound by the 10-point rule).
// `offPlayer` (on court) leaves and is marked as already-played this round; `onPlayer`
// (off court) comes on at the SECOND position and is exempt from the played-this-round rule.
function applySwapCard(targetTeam, offPlayer, onPlayer) {
  if (!state || !state.rotation || !state.rotation[targetTeam]) {
    return false;
  }

  const rot = state.rotation[targetTeam];
  const teamPlayers = state.config.rosters[targetTeam];
  if (!rot.onCourt.includes(offPlayer) || rot.onCourt.includes(onPlayer) || !teamPlayers.includes(onPlayer)) {
    return false;
  }

  const kept = rot.onCourt.find((p) => p !== offPlayer);
  rot.onCourt = [kept, onPlayer];
  // The incoming player no longer waits in this round's queue; the outgoing one is done.
  rot.upcoming = rot.upcoming.filter((p) => p !== onPlayer && p !== offPlayer);
  if (!rot.playedThisRound.includes(offPlayer)) {
    rot.playedThisRound.push(offPlayer);
  }
  if (!rot.playedThisRound.includes(onPlayer)) {
    rot.playedThisRound.push(onPlayer);
  }

  ensureRotationRound(rot, teamPlayers);
  return true;
}

function isSwapCard(card) {
  return String(card?.text || "").includes("换人卡");
}

function renderRotationOrder(listEl, rot) {
  listEl.innerHTML = "";
  if (!rot || rot.upcoming.length === 0) {
    const li = document.createElement("li");
    li.className = "rotation-order-empty";
    li.textContent = "本轮换人已完成";
    listEl.appendChild(li);
    return;
  }

  rot.upcoming.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name;
    if (index === 0) {
      li.classList.add("next");
    }
    listEl.appendChild(li);
  });
}

function renderRotationPanel() {
  if (!rotationPanel) {
    return;
  }

  const active = Boolean(state && state.config && state.config.enableRandomDoubles && state.rotation);
  rotationPanel.classList.toggle("hidden", !active);
  if (!active) {
    return;
  }

  rotationTeamAName.textContent = state.config.teamAName;
  rotationTeamBName.textContent = state.config.teamBName;
  rotationRoundA.textContent = `第 ${state.rotation.A.round} 轮`;
  rotationRoundB.textContent = `第 ${state.rotation.B.round} 轮`;
  rotationOnCourtA.textContent = state.rotation.A.onCourt.join("、") || "—";
  rotationOnCourtB.textContent = state.rotation.B.onCourt.join("、") || "—";
  renderRotationOrder(rotationOrderA, state.rotation.A);
  renderRotationOrder(rotationOrderB, state.rotation.B);
}

// Populate the 10-point swap modal: show the new on-court pairs in random doubles mode.
function updateSwapPromptContent() {
  const randomDoubles = Boolean(state && state.config && state.config.enableRandomDoubles && state.rotation);

  if (swapPromptDefaultMsg) {
    swapPromptDefaultMsg.classList.toggle("hidden", randomDoubles);
  }
  if (!swapPromptRotationInfo) {
    return;
  }

  if (!randomDoubles) {
    swapPromptRotationInfo.classList.add("hidden");
    swapPromptRotationInfo.innerHTML = "";
    return;
  }

  swapPromptRotationInfo.classList.remove("hidden");
  swapPromptRotationInfo.innerHTML = [
    "<p>已满 10 分，系统已自动换人，本轮上场：</p>",
    `<p class="swap-rotation-team"><strong>${state.config.teamAName}</strong>：${state.rotation.A.onCourt.join("、")}</p>`,
    `<p class="swap-rotation-team"><strong>${state.config.teamBName}</strong>：${state.rotation.B.onCourt.join("、")}</p>`
  ].join("");
}

// ============================
// 换人卡 Special Substitution Chooser
// ============================
function otherTeam(team) {
  return team === "A" ? "B" : "A";
}

function teamName(team) {
  return team === "A" ? state.config.teamAName : state.config.teamBName;
}

function benchPlayers(team) {
  const rot = state.rotation[team];
  return state.config.rosters[team].filter((p) => !rot.onCourt.includes(p));
}

function openSwapCardChooser(drawingTeam) {
  if (!swapCardModal || !state || !state.rotation) {
    return;
  }
  pendingSwapCard = { drawingTeam, targetTeam: drawingTeam, offPlayer: null, onPlayer: null };
  renderSwapCardChooser();
  swapCardModal.classList.remove("hidden");
}

function hideSwapCardModal() {
  if (swapCardModal) {
    swapCardModal.classList.add("hidden");
  }
}

function buildSwapOptionButton(label, selected, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn tertiary swap-card-option" + (selected ? " selected" : "");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderSwapCardChooser() {
  if (!pendingSwapCard || !state || !state.rotation) {
    return;
  }

  const { drawingTeam, targetTeam, offPlayer, onPlayer } = pendingSwapCard;

  if (swapCardSelfBtn) {
    swapCardSelfBtn.textContent = `换本方（${teamName(drawingTeam)}）`;
    swapCardSelfBtn.classList.toggle("selected", targetTeam === drawingTeam);
  }
  if (swapCardOppBtn) {
    swapCardOppBtn.textContent = `换对方（${teamName(otherTeam(drawingTeam))}）`;
    swapCardOppBtn.classList.toggle("selected", targetTeam !== drawingTeam);
  }

  const rot = state.rotation[targetTeam];
  const bench = benchPlayers(targetTeam);

  swapCardOffOptions.innerHTML = "";
  rot.onCourt.forEach((name) => {
    swapCardOffOptions.appendChild(
      buildSwapOptionButton(name, name === offPlayer, () => {
        pendingSwapCard.offPlayer = name;
        renderSwapCardChooser();
      })
    );
  });

  swapCardOnOptions.innerHTML = "";
  if (bench.length === 0) {
    const empty = document.createElement("p");
    empty.className = "swap-card-empty";
    empty.textContent = "该队没有可上场的替补球员";
    swapCardOnOptions.appendChild(empty);
  } else {
    bench.forEach((name) => {
      const played = rot.playedThisRound.includes(name);
      swapCardOnOptions.appendChild(
        buildSwapOptionButton(played ? `${name}（本轮已上过）` : name, name === onPlayer, () => {
          pendingSwapCard.onPlayer = name;
          renderSwapCardChooser();
        })
      );
    });
  }

  if (swapCardConfirmBtn) {
    swapCardConfirmBtn.disabled = !(offPlayer && onPlayer);
  }
}

function selectSwapTarget(target) {
  if (!pendingSwapCard) {
    return;
  }
  const next = target === "self" ? pendingSwapCard.drawingTeam : otherTeam(pendingSwapCard.drawingTeam);
  if (next === pendingSwapCard.targetTeam) {
    return;
  }
  pendingSwapCard.targetTeam = next;
  pendingSwapCard.offPlayer = null;
  pendingSwapCard.onPlayer = null;
  renderSwapCardChooser();
}

function confirmSwapCard() {
  if (!pendingSwapCard || !pendingSwapCard.offPlayer || !pendingSwapCard.onPlayer) {
    return;
  }

  const { targetTeam, offPlayer, onPlayer } = pendingSwapCard;
  const applied = applySwapCard(targetTeam, offPlayer, onPlayer);
  if (applied) {
    showToast(`换人卡：${teamName(targetTeam)} 换下 ${offPlayer}，${onPlayer} 上场`);
  }

  pendingSwapCard = null;
  hideSwapCardModal();
  render();
}

function cancelSwapCard() {
  pendingSwapCard = null;
  hideSwapCardModal();
  render();
}

addMaleBtn.addEventListener("click", () => {
  addPlayer("male", maleNameInput.value);
  maleNameInput.value = "";
  maleNameInput.focus();
});

addFemaleBtn.addEventListener("click", () => {
  addPlayer("female", femaleNameInput.value);
  femaleNameInput.value = "";
  femaleNameInput.focus();
});

maleNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addMaleBtn.click();
  }
});

femaleNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addFemaleBtn.click();
  }
});

assignOneBtn.addEventListener("click", assignNextPlayer);
assignAllBtn.addEventListener("click", assignAllPlayers);
resetGroupingBtn.addEventListener("click", resetGrouping);
inputTeamAName.addEventListener("input", renderGrouping);
inputTeamBName.addEventListener("input", renderGrouping);

renderGrouping();

refreshRecoveryAvailability();
