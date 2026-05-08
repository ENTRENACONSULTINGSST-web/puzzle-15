const config = {
    type: Phaser.AUTO,
    width: 540,
    height: 750,
    backgroundColor: "#111",
    scene: { preload, create }
};

const game = new Phaser.Game(config);

const GRID = 4;
const SIZE = 125; 
const GAP = 2;   
const OFFSET_X = 20;
const OFFSET_Y = 220; 
const MAX_TIME = 180; 

let pieces = [];
let empty = { row: 3, col: 3 };
let isGameOver = false;
let timeLeft = MAX_TIME;
let timerText;
let timerEvent;
let btnShowSolution;

// --- CONFIGURACIÓN DE IMÁGENES ---
// Asegúrate de que los nombres y extensiones coincidan exactamente con tus archivos en /assets
const misImagenes = ["imagen1.jpg", "imagen2.jpg", "imagen3.jpg"];

function preload() {
    // Seleccionar una imagen al azar de la lista
    const imagenElegida = Phaser.Utils.Array.GetRandom(misImagenes);
    console.log("Jugando con:", imagenElegida);
    
    // La cargamos con el alias "photo" para que el resto del código funcione siempre
    this.load.image("photo", "assets/" + imagenElegida);
}

function create() {
    const texture = this.textures.get("photo");
    const baseImg = texture.getSourceImage();
    
    // LÓGICA DE RECORTE AUTOMÁTICO (Funciona para cualquier resolución)
    const realW = baseImg.width;
    const realH = baseImg.height;
    
    // Tomamos el lado más corto para hacer un cuadrado perfecto
    const sizeToCrop = Math.min(realW, realH); 
    
    // Calculamos coordenadas para recortar el CENTRO de la imagen
    const startX = (realW - sizeToCrop) / 2;
    const startY = (realH - sizeToCrop) / 2;
    const step = sizeToCrop / GRID;

    // Crear los 16 cuadros (frames)
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            let index = r * GRID + c;
            texture.add(index, 0, startX + (c * step), startY + (r * step), step, step);
        }
    }
    // Frame 99: Imagen completa para la solución
    texture.add(99, 0, startX, startY, sizeToCrop, sizeToCrop);

    // Dibujar el Tablero de Juego
    for (let row = 0; row < GRID; row++) {
        pieces[row] = [];
        for (let col = 0; col < GRID; col++) {
            if (row === 3 && col === 3) {
                pieces[row][col] = null;
                continue;
            }

            const x = OFFSET_X + col * (SIZE + GAP);
            const y = OFFSET_Y + row * (SIZE + GAP);

            const piece = this.add.image(x, y, "photo", row * GRID + col).setOrigin(0);
            piece.setDisplaySize(SIZE, SIZE);
            const border = this.add.rectangle(x, y, SIZE, SIZE).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.2);

            piece.setInteractive({ useHandCursor: true });
            piece.row = row;
            piece.col = col;
            piece.correctRow = row;
            piece.correctCol = col;
            piece.border = border;

            piece.on("pointerdown", () => movePiece.call(this, piece));
            pieces[row][col] = piece;
        }
    }

    // --- INTERFAZ (UI) ---

    // Temporizador a la izquierda
    timerText = this.add.text(20, 65, `Tiempo: ${timeLeft}s`, { 
        fontSize: '34px', 
        fill: '#fff', 
        fontFamily: 'Courier New', 
        fontWeight: 'bold' 
    });

    // Botón REINICIAR a la derecha (Ancho 140px para no tapar el tiempo)
    createButton(this, 440, 85, 140, "REINICIAR", 0xcc0000, () => {
        location.reload();
    });

    // Botón VER IMAGEN COMPLETA (Se activa al perder)
    btnShowSolution = createButton(this, 270, 160, 260, "VER IMAGEN COMPLETA", 0x444444, () => {
        showFullImage.call(this);
    });
    btnShowSolution.setVisible(false);

    // Evento del Temporizador
    timerEvent = this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!isGameOver) {
                timeLeft--;
                timerText.setText(`Tiempo: ${timeLeft}s`);
                
                if (timeLeft <= 0) {
                    endGameByTime.call(this);
                }
            }
        },
        loop: true
    });

    shuffleBoard.call(this);
}

// Función para crear botones estilizados
function createButton(scene, x, y, width, label, color, callback) {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, 50, color).setInteractive({ useHandCursor: true });
    const txt = scene.add.text(0, 0, label, { 
        fontSize: '15px', 
        fill: '#fff', 
        fontFamily: 'Courier New',
        fontWeight: 'bold' 
    }).setOrigin(0.5);
    
    container.add([bg, txt]);
    bg.on("pointerdown", callback);
    return container;
}

function endGameByTime() {
    isGameOver = true;
    timerText.setText("¡TIEMPO AGOTADO!").setFill("#ff0000");
    btnShowSolution.setVisible(true); 
    pieces.forEach(row => row.forEach(p => { if(p) p.disableInteractive(); }));
}

function showFullImage() {
    const totalSize = (SIZE * GRID) + (GAP * (GRID - 1));
    const solutionImg = this.add.image(OFFSET_X, OFFSET_Y, "photo", 99).setOrigin(0);
    solutionImg.setDisplaySize(totalSize, totalSize);
    solutionImg.setDepth(100); 
    
    this.add.text(270, OFFSET_Y + totalSize + 30, "IMAGEN ORIGINAL", { 
        fontSize: '22px', fill: '#00ff00', fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(101);
}

function movePiece(piece) {
    if (isGameOver) return;
    const dRow = Math.abs(piece.row - empty.row);
    const dCol = Math.abs(piece.col - empty.col);

    if ((dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1)) {
        const oldR = piece.row, oldC = piece.col;
        pieces[empty.row][empty.col] = piece;
        pieces[oldR][oldC] = null;
        piece.row = empty.row; piece.col = empty.col;
        empty.row = oldR; empty.col = oldC;

        this.tweens.add({
            targets: [piece, piece.border],
            x: OFFSET_X + piece.col * (SIZE + GAP),
            y: OFFSET_Y + piece.row * (SIZE + GAP),
            duration: 150,
            ease: 'Cubic.easeOut',
            onComplete: () => checkWin.call(this)
        });
    }
}

function shuffleBoard() {
    for (let i = 0; i < 100; i++) {
        const neighbors = [];
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        dirs.forEach(d => {
            const nr = empty.row + d[0], nc = empty.col + d[1];
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && pieces[nr][nc]) neighbors.push(pieces[nr][nc]);
        });
        const p = Phaser.Utils.Array.GetRandom(neighbors);
        const or = p.row, oc = p.col;
        pieces[empty.row][empty.col] = p; pieces[or][oc] = null;
        p.row = empty.row; p.col = empty.col; empty.row = or; empty.col = oc;
        const nx = OFFSET_X + p.col * (SIZE + GAP), ny = OFFSET_Y + p.row * (SIZE + GAP);
        p.setPosition(nx, ny); p.border.setPosition(nx, ny);
    }
}

function checkWin() {
    let matches = 0;
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const p = pieces[r][c];
            if (p && p.row === p.correctRow && p.col === p.correctCol) matches++;
        }
    }
    if (matches === 15) {
        isGameOver = true;
        timerText.setText(`¡GANASTE!`).setFill("#00ff00");
    }
}
