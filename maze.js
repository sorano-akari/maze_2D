const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const messageDiv = document.getElementById('message');
const retryButton = document.getElementById('retry-button');
const giveUpButton = document.getElementById('giveUpButton');
const autoPlayButton = document.getElementById('autoPlayButton');
const startButton = document.getElementById('startButton');
const mazeSizeSelect = document.getElementById('mazeSize');
const mazeAlgorithmSelect = document.getElementById('mazeAlgorithm');
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');

let currentMazeRows = 10;
let currentMazeCols = 10;
let cellSize = 20;
let maze = [];
let player = { x: 0, y: 0 };
let start = { x: 0, y: 0 };
let goal = { x: currentMazeCols - 1, y: currentMazeRows - 1 };
let visitedPath = [];

let isAutoPlaying = false;
let autoPlayInterval = null;
let pathfindingSolution = [];

document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    startButton.addEventListener('click', () => {
        const [cols, rows] = mazeSizeSelect.value.split(',').map(Number);
        currentMazeCols = cols;
        currentMazeRows = rows;
        goal = { x: currentMazeCols - 1, y: currentMazeRows - 1 };
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        startGame();
    });

    retryButton.addEventListener('click', () => {
        const [cols, rows] = mazeSizeSelect.value.split(',').map(Number);
        currentMazeCols = cols;
        currentMazeRows = rows;
        goal = { x: currentMazeCols - 1, y: currentMazeRows - 1 };
        startScreen.style.display = 'block';
        gameContainer.style.display = 'none';
        messageDiv.textContent = "";
        retryButton.style.display = 'none';
        autoPlayButton.textContent = "オートプレイ";
        isAutoPlaying = false;
        clearInterval(autoPlayInterval);
        document.removeEventListener('keydown', handleKeyPress);
    });

    giveUpButton.addEventListener('click', () => {
        if (confirm("本当にギブアップしますか？")) {
            const [cols, rows] = mazeSizeSelect.value.split(',').map(Number);
            currentMazeCols = cols;
            currentMazeRows = rows;
            goal = { x: currentMazeCols - 1, y: currentMazeRows - 1 };
            startScreen.style.display = 'block';
            gameContainer.style.display = 'none';
            messageDiv.textContent = "";
            retryButton.style.display = 'none';
            autoPlayButton.textContent = "オートプレイ";
            isAutoPlaying = false;
            clearInterval(autoPlayInterval);
            document.removeEventListener('keydown', handleKeyPress);
        }
    });

    autoPlayButton.addEventListener('click', toggleAutoPlay);
}

function initializeMaze(rows, cols, allWalls = true) {
    maze = Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({
        top: allWalls, right: allWalls, bottom: allWalls, left: allWalls, visited: false
    })));
    visitedPath = [];
}

function drawMaze() {
    // 内壁を描画
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    for (let r = 0; r < currentMazeRows; r++) {
        for (let c = 0; c < currentMazeCols; c++) {
            const cell = maze[r][c];
            const x = c * cellSize;
            const y = r * cellSize;

            ctx.beginPath();
            if (cell.top && r > 0) { // 上の内壁
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
            }
            if (cell.right && c < currentMazeCols - 1) { // 右の内壁
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
            }
            if (cell.bottom && r < currentMazeRows - 1) { // 下の内壁
                ctx.moveTo(x + cellSize, y + cellSize);
                ctx.lineTo(x, y + cellSize);
            }
            if (cell.left && c > 0) { // 左の内壁
                ctx.moveTo(x, y + cellSize);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    // 外壁を太く描画
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    for (let r = 0; r < currentMazeRows; r++) {
        for (let c = 0; c < currentMazeCols; c++) {
            const cell = maze[r][c];
            const x = c * cellSize;
            const y = r * cellSize;

            ctx.beginPath();
            if (cell.top && r === 0) { // 上の外壁
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
            }
            if (cell.right && c === currentMazeCols - 1) { // 右の外壁
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
            }
            if (cell.bottom && r === currentMazeRows - 1) { // 下の外壁
                ctx.moveTo(x + cellSize, y + cellSize);
                ctx.lineTo(x, y + cellSize);
            }
            if (cell.left && c === 0) { // 左の外壁
                ctx.moveTo(x, y + cellSize);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
}

// DFSアルゴリズム (壁を掘る)
function generateMazeDFS(r, c) {
    maze[r][c].visited = true;
    const directions = shuffle([[0, 1], [0, -1], [1, 0], [-1, 0]]);

    for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;

        if (nr >= 0 && nr < currentMazeRows && nc >= 0 && nc < currentMazeCols && !maze[nr][nc].visited) {
            if (dr === 0 && dc === 1) { // 右
                maze[r][c].right = false;
                maze[nr][nc].left = false;
            } else if (dr === 0 && dc === -1) { // 左
                maze[r][c].left = false;
                maze[nr][nc].right = false;
            } else if (dr === 1 && dc === 0) { // 下
                maze[r][c].bottom = false;
                maze[nr][nc].top = false;
            } else if (dr === -1 && dc === 0) { // 上
                maze[r][c].top = false;
                maze[nr][nc].bottom = false;
            }
            generateMazeDFS(nr, nc);
        }
    }
}

// プリムのアルゴリズム (壁を掘る)
function generateMazePrim(startR, startC) {
    const walls = [];

    maze[startR][startC].visited = true;
    addWalls(startR, startC, walls);

    while (walls.length > 0) {
        const wallIndex = Math.floor(Math.random() * walls.length);
        const [r, c, dir] = walls[wallIndex];

        let newR, newC;
        if (dir === 'top') {
            newR = r - 1; newC = c;
        } else if (dir === 'right') {
            newR = r; newC = c + 1;
        } else if (dir === 'bottom') {
            newR = r + 1; newC = c;
        } else {
            newR = r; newC = c - 1;
        }

        if (newR >= 0 && newR < currentMazeRows && newC >= 0 && newC < currentMazeCols && !maze[newR][newC].visited) {
            if (dir === 'top') {
                maze[r][c].top = false;
                maze[newR][newC].bottom = false;
            } else if (dir === 'right') {
                maze[r][c].right = false;
                maze[newR][newC].left = false;
            } else if (dir === 'bottom') {
                maze[r][c].bottom = false;
                maze[newR][newC].top = false;
            } else {
                maze[r][c].left = false;
                maze[newR][newC].right = false;
            }

            maze[newR][newC].visited = true;
            addWalls(newR, newC, walls);
        }

        walls.splice(wallIndex, 1);
    }
}

function addWalls(r, c, walls) {
    if (r > 0) walls.push([r, c, 'top']);
    if (c < currentMazeCols - 1) walls.push([r, c, 'right']);
    if (r < currentMazeRows - 1) walls.push([r, c, 'bottom']);
    if (c > 0) walls.push([r, c, 'left']);
}

// 穴掘り法（Recursive Division Algorithm）
function generateMazeRecursiveDivision(x, y, width, height) {
    if (width < 2 || height < 2) {
        return;
    }

    const horizontalSplit = height > width || (height === width && Math.random() < 0.5);

    if (horizontalSplit) {
        const wallY = y + Math.floor(Math.random() * (height - 1));
        const passageX = x + Math.floor(Math.random() * width);

        for (let i = x; i < x + width; i++) {
            maze[wallY][i].bottom = true;
            maze[wallY + 1][i].top = true;
        }
        maze[wallY][passageX].bottom = false;
        maze[wallY + 1][passageX].top = false;

        generateMazeRecursiveDivision(x, y, width, wallY - y + 1);
        generateMazeRecursiveDivision(x, wallY + 1, width, y + height - (wallY + 1));
    } else {
        const wallX = x + Math.floor(Math.random() * (width - 1));
        const passageY = y + Math.floor(Math.random() * height);

        for (let i = y; i < y + height; i++) {
            maze[i][wallX].right = true;
            maze[i][wallX + 1].left = true;
        }
        maze[passageY][wallX].right = false;
        maze[passageY][wallX + 1].left = false;

        generateMazeRecursiveDivision(x, y, wallX - x + 1, height);
        generateMazeRecursiveDivision(wallX + 1, y, x + width - (wallX + 1), height);
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function drawPlayer() {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawStar(x, y, size, color) {
    const p = x * cellSize + cellSize / 2;
    const q = y * cellSize + cellSize / 2;
    const r = size / 2;
    const n = 5; // 星の頂点の数

    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI / n) * (2 * i - 0.5);
        const x_outer = p + r * Math.cos(angle);
        const y_outer = q + r * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x_outer, y_outer);
        } else {
            ctx.lineTo(x_outer, y_outer);
        }
        const inner_r = r / 2.5; // 内側の半径
        const angle_inner = (Math.PI / n) * (2 * i + 0.5);
        const x_inner = p + inner_r * Math.cos(angle_inner);
        const y_inner = q + inner_r * Math.sin(angle_inner);
        ctx.lineTo(x_inner, y_inner);
    }
    ctx.closePath();
    ctx.fill();
}

function drawStartAndGoal() {
    ctx.fillStyle = 'green';
    ctx.fillRect(start.x * cellSize, start.y * cellSize, cellSize, cellSize);
    drawStar(goal.x, goal.y, cellSize * 0.9, '#FFFF00');
}

function drawVisitedPath() {
    ctx.fillStyle = 'lightgray';
    for (const p of visitedPath) {
        ctx.beginPath();
        ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, cellSize / 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderGame() {
    // 背景を白で塗りつぶす
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawVisitedPath();
    drawMaze();
    drawStartAndGoal();
    drawPlayer();

    if (player.x === goal.x && player.y === goal.y) {
        messageDiv.textContent = "Clear!";
        retryButton.style.display = 'block';
        giveUpButton.style.display = 'none';
        autoPlayButton.style.display = 'none';

        isAutoPlaying = false;
        clearInterval(autoPlayInterval);
        document.removeEventListener('keydown', handleKeyPress);

        const [lastCols, lastRows] = mazeSizeSelect.options[mazeSizeSelect.options.length - 1].value.split(',').map(Number);
        if (currentMazeCols === lastCols && currentMazeRows === lastRows) {
            messageDiv.textContent = "Congrats!";
            retryButton.style.display = 'block';
        }
    } else {
        messageDiv.textContent = "";
    }
}

function handleKeyPress(e) {
    if (player.x === goal.x && player.y === goal.y || isAutoPlaying) {
        return;
    }

    let newX = player.x;
    let newY = player.y;
    const currentCell = maze[player.y][player.x];

    switch (e.key) {
        case 'ArrowUp':
            if (!currentCell.top) {
                newY--;
            }
            break;
        case 'ArrowDown':
            if (!currentCell.bottom) {
                newY++;
            }
            break;
        case 'ArrowLeft':
            if (!currentCell.left) {
                newX--;
            }
            break;
        case 'ArrowRight':
            if (!currentCell.right) {
                newX++;
            }
            break;
    }

    if (newX >= 0 && newX < currentMazeCols && newY >= 0 && newY < currentMazeRows) {
        player.x = newX;
        player.y = newY;

        if (!visitedPath.some(p => p.x === player.x && p.y === player.y)) {
            visitedPath.push({ x: player.x, y: player.y });
        }

        renderGame();
    }
}

function startGame() {
    clearInterval(autoPlayInterval);
    isAutoPlaying = false;
    autoPlayButton.textContent = "オートプレイ";

    const maxCanvasWidth = window.innerWidth * 0.9;
    const maxCanvasHeight = window.innerHeight * 0.8;
    const calculatedCellSize = Math.min(
        Math.floor(maxCanvasWidth / currentMazeCols),
        Math.floor(maxCanvasHeight / currentMazeRows)
    );
    const minCellSize = 2;
    cellSize = Math.max(minCellSize, calculatedCellSize);

    canvas.width = currentMazeCols * cellSize;
    canvas.height = currentMazeRows * cellSize;

    start = { x: 0, y: 0 };
    goal = { x: currentMazeCols - 1, y: currentMazeRows - 1 };

    const selectedAlgorithm = mazeAlgorithmSelect.value;
    if (selectedAlgorithm === 'prim') {
        initializeMaze(currentMazeRows, currentMazeCols, true);
        generateMazePrim(0, 0);
    } else if (selectedAlgorithm === 'recursiveDivision') {
        initializeMaze(currentMazeRows, currentMazeCols, false);
        // 外周の壁を立てる
        for (let r = 0; r < currentMazeRows; r++) {
            maze[r][0].left = true;
            maze[r][currentMazeCols - 1].right = true;
        }
        for (let c = 0; c < currentMazeCols; c++) {
            maze[0][c].top = true;
            maze[currentMazeRows - 1][c].bottom = true;
        }
        generateMazeRecursiveDivision(0, 0, currentMazeCols, currentMazeRows);
    } else { // dfs
        initializeMaze(currentMazeRows, currentMazeCols, true);
        generateMazeDFS(0, 0);
    }

    // 迷路生成後にスタートとゴールの壁を破壊
    maze[start.y][start.x].left = false;
    maze[goal.y][goal.x].right = false;

    player.x = start.x;
    player.y = start.y;

    visitedPath = [];
    visitedPath.push({ x: player.x, y: player.y });

    document.removeEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleKeyPress);

    messageDiv.textContent = "";
    retryButton.style.display = 'none';
    giveUpButton.style.display = 'inline-block';
    autoPlayButton.style.display = 'inline-block';

    renderGame();
}

function toggleAutoPlay() {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
        autoPlayButton.textContent = "手動プレイに戻る";
        document.removeEventListener('keydown', handleKeyPress);
        findPathForAutoPlay();
        startAutoPlay();
    } else {
        autoPlayButton.textContent = "オートプレイ";
        document.addEventListener('keydown', handleKeyPress);
        clearInterval(autoPlayInterval);
    }
}

function startAutoPlay() {
    let pathIndex = 0;
    clearInterval(autoPlayInterval);

    if (pathfindingSolution.length === 0) {
        messageDiv.textContent = "オートプレイ: ゴールが見つかりませんでした。";
        isAutoPlaying = false;
        autoPlayButton.textContent = "オートプレイ";
        document.addEventListener('keydown', handleKeyPress);
        return;
    }

    autoPlayInterval = setInterval(() => {
        if (pathIndex < pathfindingSolution.length) {
            const nextMove = pathfindingSolution[pathIndex];
            player.x = nextMove.x;
            player.y = nextMove.y;

            if (!visitedPath.some(p => p.x === player.x && p.y === player.y)) {
                visitedPath.push({ x: player.x, y: player.y });
            }
            renderGame();

            if (player.x === goal.x && player.y === goal.y) {
                clearInterval(autoPlayInterval);
                messageDiv.textContent = "オートプレイ完了！";
            }
            pathIndex++;
        } else {
            clearInterval(autoPlayInterval);
            if (!(player.x === goal.x && player.y === goal.y)) {
                messageDiv.textContent = "オートプレイ: ゴールに到達できませんでした。";
            }
            isAutoPlaying = false;
            autoPlayButton.textContent = "オートプレイ";
            document.addEventListener('keydown', handleKeyPress);
        }
    }, 100);
}

function findPathForAutoPlay() {
    const queue = [];
    const visitedAutoPlay = Array(currentMazeRows).fill(0).map(() => Array(currentMazeCols).fill(false));

    queue.push({ x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] });
    visitedAutoPlay[start.y][start.x] = true;

    while (queue.length > 0) {
        const { x, y, path } = queue.shift();

        if (x === goal.x && y === goal.y) {
            pathfindingSolution = path;
            return;
        }

        const currentCell = maze[y][x];
        const neighbors = [];

        if (y > 0 && !currentCell.top) {
            neighbors.push({ nx: x, ny: y - 1 });
        }
        if (y < currentMazeRows - 1 && !currentCell.bottom) {
            neighbors.push({ nx: x, ny: y + 1 });
        }
        if (x > 0 && !currentCell.left) {
            neighbors.push({ nx: x - 1, ny: y });
        }
        if (x < currentMazeCols - 1 && !currentCell.right) {
            neighbors.push({ nx: x + 1, ny: y });
        }

        for (const { nx, ny } of neighbors) {
            if (!visitedAutoPlay[ny][nx]) {
                visitedAutoPlay[ny][nx] = true;
                const newPath = [...path, { x: nx, y: ny }];
                queue.push({ x: nx, y: ny, path: newPath });
            }
        }
    }
    pathfindingSolution = [];
}