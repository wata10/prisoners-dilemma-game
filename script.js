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

// --- DOM要素の取得 ---
const startGameBtn = document.getElementById('start-game');
const restartGameBtn = document.getElementById('restart-game');
const roundDisplay = document.getElementById('round-display');
const cooperateBtn = document.getElementById('cooperate-btn');
const defectBtn = document.getElementById('defect-btn');
const roundResultsDiv = document.getElementById('round-results');
const overallResultsDiv = document.getElementById('overall-results');
const cpuStrategySpan = document.getElementById('cpu-strategy');
const cpuStrategyDescription = document.getElementById('cpu-strategy-description'); // ★追加
const playerTotalScoreSpan = document.getElementById('player-total-score');
const cpuTotalScoreSpan = document.getElementById('cpu-total-score');
const playerAvgScoreSpan = document.getElementById('player-avg-score');
const cpuAvgScoreSpan = document.getElementById('cpu-avg-score');
const winnerMessage = document.getElementById('winner-message');

// --- ゲームの状態変数 ---
// let totalRounds = 0; // totalRoundsは不要になったので削除
let currentRound = 0;
let playerHistory = [];
let cpuHistory = [];
let playerScores = [];
let cpuScores = [];
let chosenStrategyFunc = null;
let chosenStrategyName = "";

// --- ★追加：戦略の説明 ---
const strategyDescriptions = {
    "TFT（しっぺ返し戦略）": "最初の回は協力し、以降は相手が前回出した手をそのまま真似します。やられたらやり返す、シンプルな戦略です。どんな相手にも一方的に搾取されることがない一方、相手が間違えて裏切ってしまった場合、報復の連鎖に陥ります(ライバル戦楽)。",
    "WSLS（勝ち逃げ負け残り戦略）": "前回自分が得た点数が相手より高ければ同じ手を、低ければ違う手を出します。自分の状況に応じて行動を変える戦略です。うっかり裏切ってしまった場合にも数ステップ後には相互協力状態に戻れますが、裏切り続ける相手には一方的に搾取されてしまいます(パートナー戦略)。",
    "TFT-ATFT（適応的しっぺ返し戦略）": "基本はTFTと同じですが、相手の裏切りが多いと判断すると、それ以降は自分も裏切り続けるようになります。相手の性格を読んで適応する戦略です。友好的ライバル戦略の1つです。"
};

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

// --- ★変更：ゲーム終了判定関数 ---
function shouldGameEnd() {
    const rand = Math.random(); // 0.0以上1.0未満の乱数
    if (currentRound >= 1 && currentRound <= 9) {
        return rand < 0.03; // 3%の確率で終了
    } else if (currentRound >= 10 && currentRound <= 14) {
        return rand < 0.10; // 10%の確率で終了
    } else if (currentRound >= 15) {
        return rand < 0.25; // 25%の確率で終了
    }
    return false; // 上記以外は終了しない
}

// --- ゲーム初期化処理 (totalRoundsの削除) ---
function initializeGame() {
    currentRound = 0;
    playerHistory = [];
    cpuHistory = [];
    playerScores = [];
    cpuScores = [];

    const strategies = [
        { func: titForTat, name: "TFT（しっぺ返し戦略）", weight: 0.10 },
        { func: winStayLoseShift, name: "WSLS（勝ち逃げ負け残り戦略）", weight: 0.10 },
        { func: adaptiveTitForTat, name: "TFT-ATFT（適応的しっぺ返し戦略）", weight: 0.80 }
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

    document.getElementById('game-info').style.display = 'block';
    startGameBtn.style.display = 'block';
    roundDisplay.style.display = 'none';
    overallResultsDiv.style.display = 'none';
    roundResultsDiv.innerHTML = '';
}

// --- ★変更：ラウンド処理 (終了判定の変更) ---
function playRound(playerMove) {
    currentRound++; 

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

    // 毎ラウンド終了判定を呼び出す
    if (shouldGameEnd()) {
        endGame();
    }
}

// --- ★変更：ゲーム終了処理 (説明表示と平均点計算) ---
function endGame() {
    roundDisplay.style.display = 'none';
    overallResultsDiv.style.display = 'block';

    const totalPlayedRounds = currentRound; // プレイした総ラウンド数を取得
    const playerTotalScore = playerScores.reduce((a, b) => a + b, 0);
    const cpuTotalScore = cpuScores.reduce((a, b) => a + b, 0);
    // プレイした総ラウンド数で平均を計算
    const playerAvgScore = (playerTotalScore / totalPlayedRounds).toFixed(2);
    const cpuAvgScore = (cpuTotalScore / totalPlayedRounds).toFixed(2);

    cpuStrategySpan.textContent = chosenStrategyName;
    cpuStrategyDescription.textContent = strategyDescriptions[chosenStrategyName]; // ★説明を表示
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

// --- イベントリスナー (変更なし) ---
startGameBtn.addEventListener('click', () => {
    currentRound = 0;
    startGameBtn.style.display = 'none';
    roundDisplay.style.display = 'block';
    roundResultsDiv.innerHTML = 'あなたの選択を待っています...';
});

cooperateBtn.addEventListener('click', () => playRound(COOPERATE));
defectBtn.addEventListener('click', () => playRound(DEFECT));
restartGameBtn.addEventListener('click', initializeGame);

document.addEventListener('DOMContentLoaded', initializeGame);