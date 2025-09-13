// --- 定数の定義 ---
const COOPERATE = "黙秘";
const DEFECT = "自白";

// --- 利得表 ---
const PAYOFFS = {
    [COOPERATE]: {
        [COOPERATE]: [2, 2],
        [DEFECT]: [0, 3]
    },
    [DEFECT]: {
        [COOPERATE]: [3, 0],
        [DEFECT]: [1, 1]
    }
};

// --- DOM要素の取得 (ラウンド数関連の2行を削除) ---
const startGameBtn = document.getElementById('start-game');
const restartGameBtn = document.getElementById('restart-game');
const roundDisplay = document.getElementById('round-display');
const cooperateBtn = document.getElementById('cooperate-btn');
const defectBtn = document.getElementById('defect-btn');
const roundResultsDiv = document.getElementById('round-results');
const overallResultsDiv = document.getElementById('overall-results');
const cpuStrategySpan = document.getElementById('cpu-strategy');
const playerTotalScoreSpan = document.getElementById('player-total-score');
const cpuTotalScoreSpan = document.getElementById('cpu-total-score');
const playerAvgScoreSpan = document.getElementById('player-avg-score');
const cpuAvgScoreSpan = document.getElementById('cpu-avg-score');
const winnerMessage = document.getElementById('winner-message');

// --- ゲームの状態変数 ---
let totalRounds = 0;
let currentRound = 0;
let playerHistory = [];
let cpuHistory = [];
let playerScores = [];
let cpuScores = [];
let chosenStrategyFunc = null;
let chosenStrategyName = "";

// --- CPUの戦略定義 (変更なし) ---
function titForTat(player_history, cpu_history) {
    if (player_history.length === 0) return COOPERATE;
    return player_history[player_history.length - 1];
}

function winStayLoseShift(player_history, cpu_history) {
    if (cpu_history.length === 0) return COOPERATE;
    const lastCpuMove = cpu_history[cpu_history.length - 1];
    const lastPlayerMove = player_history[player_history.length - 1];
    const lastCpuPayoff = PAYOFFS[lastCpuMove][lastPlayerMove][1];
    if (lastCpuPayoff >= 2) return lastCpuMove;
    else return lastCpuMove === COOPERATE ? DEFECT : COOPERATE;
}

function adaptiveTitForTat(player_history, cpu_history) {
    if (player_history.length === 0) return COOPERATE;
    const defectionCount = player_history.filter(move => move === DEFECT).length;
    const defectionRate = defectionCount / player_history.length;
    if (defectionRate > 0.4) return DEFECT;
    else return player_history[player_history.length - 1];
}

// --- ゲーム初期化処理 ---
function initializeGame() {
    totalRounds = Math.floor(Math.random() * 6) + 10;
    currentRound = 0;
    playerHistory = [];
    cpuHistory = [];
    playerScores = [];
    cpuScores = [];

    const strategies = [
        { func: titForTat, name: "TFT（しっぺ返し戦略）", weight: 0.25 },
        { func: winStayLoseShift, name: "WSLS（勝ち逃げ負け残り戦略）", weight: 0.25 },
        { func: adaptiveTitForTat, name: "TFT-ATFT（適応的しっぺ返し戦略）", weight: 0.50 }
    ];
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (const strategy of strategies) {
        if (randomNum < strategy.weight) {
            chosenStrategyFunc = strategy.func;
            chosenStrategyName = strategy.name;
            break;
        }
        randomNum -= strategy.weight;
    }
    
    // ↓ ラウンド数を表示する処理を削除
    // totalRoundsSpan.textContent = totalRounds; 

    document.getElementById('game-info').style.display = 'block';
    startGameBtn.style.display = 'block';
    roundDisplay.style.display = 'none';
    overallResultsDiv.style.display = 'none';
    roundResultsDiv.innerHTML = '';
}

// --- ラウンド処理 ---
function playRound(playerMove) {
    currentRound++; // ラウンドカウンターは内部で動く

    const cpuMove = chosenStrategyFunc(playerHistory, cpuHistory);
    const [playerPayoff, cpuPayoff] = PAYOFFS[playerMove][cpuMove];

    playerHistory.push(playerMove);
    cpuHistory.push(cpuMove);
    playerScores.push(playerPayoff);
    cpuScores.push(cpuPayoff);

    roundResultsDiv.innerHTML = `
        <p>あなたの選択: ${playerMove}</p>
        <p>CPUの選択   : ${cpuMove}</p>
        <p>このラウンドの得点 → あなた: ${playerPayoff}点, CPU: ${cpuPayoff}点</p>
        <p>現在の合計得点 → あなた: ${playerScores.reduce((a, b) => a + b, 0)}点, CPU: ${cpuScores.reduce((a, b) => a + b, 0)}点</p>
    `;

    if (currentRound >= totalRounds) {
        endGame();
    }
}

// --- ゲーム終了処理 (変更なし) ---
function endGame() {
    roundDisplay.style.display = 'none';
    overallResultsDiv.style.display = 'block';

    const playerTotalScore = playerScores.reduce((a, b) => a + b, 0);
    const cpuTotalScore = cpuScores.reduce((a, b) => a + b, 0);
    const playerAvgScore = (playerTotalScore / totalRounds).toFixed(2);
    const cpuAvgScore = (cpuTotalScore / totalRounds).toFixed(2);

    cpuStrategySpan.textContent = chosenStrategyName;
    playerTotalScoreSpan.textContent = playerTotalScore;
    cpuTotalScoreSpan.textContent = cpuTotalScore;
    playerAvgScoreSpan.textContent = playerAvgScore;
    cpuAvgScoreSpan.textContent = cpuAvgScore;

    if (parseFloat(playerAvgScore) > parseFloat(cpuAvgScore)) {
        winnerMessage.textContent = "あなたの勝利です！";
        winnerMessage.className = 'winner';
    } else if (parseFloat(cpuAvgScore) > parseFloat(playerAvgScore)) {
        winnerMessage.textContent = "あなたの敗北です。";
        winnerMessage.className = 'winner loser';
    } else {
        winnerMessage.textContent = "引き分けです。";
        winnerMessage.className = 'winner';
    }
}

// --- イベントリスナー ---
startGameBtn.addEventListener('click', () => {
    currentRound = 0; // ゲーム開始時にラウンドをリセット
    startGameBtn.style.display = 'none';
    roundDisplay.style.display = 'block';
    roundResultsDiv.innerHTML = 'あなたの選択を待っています...';
    // ↓ ラウンド数を表示する処理を削除
    // roundNumHeader.textContent = `ラウンド ${currentRound}/${totalRounds}`;
});

cooperateBtn.addEventListener('click', () => playRound(COOPERATE));
defectBtn.addEventListener('click', () => playRound(DEFECT));
restartGameBtn.addEventListener('click', initializeGame);

document.addEventListener('DOMContentLoaded', initializeGame);