
//canvas
var canvasWidth = 600;
var canvasHeight = 600;
var canvasName = "canvas";

//paddle
var paddle;
var paddleImg = "paddle.jpg"
var paddleDefaultSpeed = 3;
var paddleNotMoving = 0;
var defaultPaddleWidth = 120;

//ball
var ballDefaultSpeed = 2;
var ballRadius = 8;

//target
var secondsToRenewTarget = 5;
var milisecondsToAddLine = 20000;
var wasMoved = false;
var targetWidth = 40;
var targetHeight = 20;
var defaultTargetShiftX = 55;
var defaultTargetShiftY = 35;
var blockImg = "target.jpg";

//game
var leftKeyCode = '37';
var rightKeyCode = '39';
var gameStarted = false;
var gameStopped = false;
var gameScore = 0;
var gameMode;
var blocks = [];
var nick;
var startGameTime;
var endGameTime;
var elapsedGameTime;
var playerId = 0;
var db;

//bonus
var bonusImg = "bonus.jpg";
var bonusOpacity = 0.7;
var bonusFallSpeed = 1;
var bonusHandlers = [];
var bonusLabels = [];
var bonusPaddleIncrease = 1.5;
var bonusPaddleShrink = 0.7;
var isControlReversed = false;
var bonuses = [];
var bonusChance = 0.2;
var newBallSpawnRate = 5;
var tillNewBallCounter = 0;
var aTobTypeBlocks = 0.5;
var balls = [];
var ballColors = ["BlueViolet", "DeepPink", "Fuchsia", "Purple"];
var ballSpawnAreaYmin = 100;
var ballSpawnAreaYmax = 150;
var labelColor = "white";
var defaultPointsPerBlock = 1;
var currentPointsPerBlock = defaultPointsPerBlock;

function initDb() {
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB ||
        window.msIndexedDB;

    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
        window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange ||
        window.webkitIDBKeyRange || window.msIDBKeyRange

    if (!window.indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB.")
    }

    var request = window.indexedDB.open("newDatabase", 1);

    request.onerror = function (event) {
        console.log("error: ");
    };

    request.onsuccess = function (event) {
        db = request.result;
        console.log("success: " + db);
    };

    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        var objectStore = db.createObjectStore("games", { keyPath: "id" });
    };
}

initDb();
document.onkeydown = checkkey;
document.onkeyup = clearmove;

function startGame() {
    readAll();
    if (!gameStarted) {
        gameMode = prompt("Select game mode. 1 - Infinite spawns, 2 - Slide");
        switch (gameMode) {
            case '1':
                gameMode = 1;
                break;
            case '2':
                gameMode = 2;
                break;
            default:
                alert("Incorrect game mode.");
                break;
        }
        if (gameMode == 1 || gameMode == 2) {
            let person = prompt("Please enter your name:", "Your Name");
            if (person == null || person == "") {
                alert("User cancelled the prompt or entered wrong name");
            } else {
                startGameTime = performance.now();
                myGameArea.start();
                nick = person;
                paddle = new Paddle(defaultPaddleWidth, 15, 260, 580);
                firstBall = new Ball(ballRadius, "BlueViolet", paddle.x + 100, paddle.y - paddle.height);
                balls.push(firstBall);
                initBonuses();
                blocks = generateTargetLocations();
                gameStarted = true;
            }
        }
    } else {
        gameStarted = false;
        gameStopped = false;
        changeToResume();
        newGame();
    }
}

function stopGame() {
    if (gameStarted) {
        if (gameStopped) {
            myGameArea.interval = setInterval(updateGameArea, 10);
            if (gameMode == 2) {
                myGameArea.newLineInterval = setInterval(addNewLine, milisecondsToAddLine);
            }
            gameStopped = false;
        } else {
            clearInterval(myGameArea.interval);
            clearInterval(myGameArea.newLineInterval);
            gameStopped = true;
        }
    }
}

function newGame() {
    if (!gameStopped) {
        gameScore = 0;
        clearInterval(myGameArea.interval);
        startGame();
    }
}

var myGameArea = {
    canvas: document.createElement(canvasName),
    start: function () {
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.interval = setInterval(updateGameArea, 10);
        if (gameMode == 2) {
            this.newLineInterval = setInterval(addNewLine, milisecondsToAddLine);
        }
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class Component {
    constructor(width, height, x, y) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.ctx = myGameArea.context;
    }
}

class Paddle extends Component {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.img = new Image();
        this.img.src = paddleImg;
        this.speedX = 0;
        this.speedY = 0;
    }
    update() {
        checkBonusToPaddleCollision();
        this.pat = this.ctx.createPattern(this.img, "repeat");
        this.ctx.fillStyle = this.pat;
        this.ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    newPos() {
        this.x += this.speedX;
        if (this.x < 0) {
            this.x = 0;
            clearmove();
        }
        if (this.x > myGameArea.canvas.width - this.width) {
            this.x = myGameArea.canvas.width - this.width;
            clearmove();
        }
        this.y += this.speedY;
    }
}

class Bonus extends Component {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.img = new Image();
        this.img.src = bonusImg;
        this.speedY = bonusFallSpeed;
        let selection = Math.floor(Math.random() * bonusHandlers.length);
        this.action = bonusHandlers[selection];
        this.label = bonusLabels[selection];
        this.update = function () {
            this.pat = this.ctx.createPattern(this.img, "repeat");
            this.ctx.font = "12px Arial";
            this.ctx.fillStyle = this.pat;
            this.ctx.fillText(this.label, this.x, this.y + 13);
        };
        this.newPos = function () {
            this.y += this.speedY;
        };
    }
}

class Block extends Component {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.img = new Image();
        this.img.src = blockImg;
        this.speedX = 0;
        this.speedY = 0;
        this.visible = true;
        this.timeInvisible = 0;
        this.isSpecialBlock = false;
        if (Math.random() > aTobTypeBlocks)
            this.isSpecialBlock = true;
    }
    update() {
        this.setCorners();
        this.pat = this.ctx.createPattern(this.img, "repeat");
        if (this.visible) {
            this.ctx.fillStyle = this.pat;
            this.ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        if (gameMode == 1 && (((performance.now() - this.timeInvisible) / 1000) >= secondsToRenewTarget)) {
            this.visible = true;
            this.timeInvisible = 0;
        }
    }
    moveTargetDown() {
        this.y = this.y + defaultTargetShiftY;
        this.update();
    }
    setCorners() {
        this.bottomLeft = [this.x, this.y];
        this.bottomRight = [this.x + this.width, this.y];
        this.topRight = [this.x + this.width, this.y + this.height];
        this.topLeft = [this.x, this.y + this.height];
    }
}

class Ball extends Component {
    constructor(ballRadius, color, x, y) {
        super(0, 0, x, y + ballRadius);
        this.ballRadius = ballRadius;
        this.speedX = ballDefaultSpeed;
        this.speedY = ballDefaultSpeed;
        this.dx = 2;
        this.dy = -2;
        this.color = color;
    }
    update() {
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();
    }
    newPos() {
        checkBallToBallCollision(this);
        checkBallToBlockCollision(this);
        if (this.x + this.dx > myGameArea.canvas.width - this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.speedX = -this.speedX;
        }
        if (this.y + this.dy < this.ballRadius) {
            this.speedY = -this.speedY;
        } else if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius - paddle.height) {
            if (this.x > paddle.x && this.x < paddle.x + paddle.width) {
                var c = calculateBallSpeed(this, paddle);
                if (this.speedX < 0) {
                    this.speedX = -ballDefaultSpeed * c;
                } else {
                    this.speedX = ballDefaultSpeed * c;
                }
                this.speedY = -this.speedY;
            }
            else {
                if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius) {
                    if (balls.length == 1) {
                        elapsedGameTime = getElapsedGameTime().toFixed(2);
                        alert("GAME OVER!! You were playing " + elapsedGameTime + " seconds!");
                        addToDatabase();
                        document.location.reload();
                        clearInterval(myGameArea.interval);
                        clearInterval(myGameArea.newLineInterval);
                    } else {
                        balls = arrayRemove(balls, this);
                    }
                }
            }
        }

        this.x += this.speedX;
        this.y -= this.speedY;
    }
}

function arrayRemove(arr, value) {

    return arr.filter(function (ele) {
        return ele != value;
    });
}

function getElapsedGameTime() {
    timeDiff = performance.now() - startGameTime;
    timeDiff /= 1000;
    return timeDiff;
}

function addNewLine() {
    blocks.forEach(element => element.moveTargetDown())
    shiftX = 0;
    for (var x = 0; x < 10; x++) {
        blocks.push(new Block(40, 20, 40 + shiftX, 40));
        shiftX += 55;
    }
}

function moveleft() {
    if (isControlReversed) {
        paddle.speedX = paddleDefaultSpeed;
    } else {
        paddle.speedX = -paddleDefaultSpeed;
    }
}

function moveright() {
    if (isControlReversed) {
        paddle.speedX = -paddleDefaultSpeed;
    } else {
        paddle.speedX = paddleDefaultSpeed;
    }
}

function applySpecialBlockLogic(target) {
    if (target.isSpecialBlock == true && Math.random() < bonusChance) {
        bonuses.push(new Bonus(target.width, target.height, target.x, target.y));
    } else {
        tillNewBallCounter++;
        if (tillNewBallCounter > newBallSpawnRate) {
            tillNewBallCounter = 0;
            balls.push(generateNewBall());
        }
    }
}

function checkBonusToPaddleCollision() {
    bonuses.forEach(bonus => {
        if (bonus.x + bonus.width > paddle.x
            && bonus.x < paddle.x + paddle.width
            && bonus.y + bonus.height > paddle.y
            && bonus.y < paddle.y + paddle.height) {
            bonus.action();
            bonus.toRemove = true;

        }
    });
    bonuses = bonuses.filter(bonus => !bonus.toRemove);
}

function clearmove() {
    paddle.speedX = paddleNotMoving;
    paddle.speedY = paddleNotMoving;
}

function checkkey(e) {
    if (e.keyCode == leftKeyCode) {
        moveleft();
    } else if (e.keyCode == rightKeyCode) {
        moveright();
    }
}

function changeNewGame() {
    var btn = document.getElementById("startButton");
    btn.innerHTML = 'NEW GAME';
}

function changeToResume() {
    var btn = document.getElementById("stopButton");
    if (btn.innerHTML == "STOP" && gameStarted) {
        btn.innerHTML = "RESUME";
    } else {
        btn.innerHTML = "STOP";
    }
}

function generateTargetLocations() {
    shiftX = 0;
    shiftY = 0;
    for (var y = 0; y < 3; y++) {
        for (var x = 0; x < 10; x++) {
            element = new Block(targetWidth, targetHeight, 40 + shiftX, 40 + shiftY);
            blocks.push(element);
            shiftX += defaultTargetShiftX;
        }
        shiftX = 0;
        shiftY += defaultTargetShiftY;
    }
    return blocks;
}

function addToDatabase() {
    var request = db.transaction(["games"], "readwrite")
        .objectStore("games")
        .add({ id: playerId, nick: nick, score: gameScore, time: elapsedGameTime });

    request.onsuccess = function (event) {
        alert("Game has been added to database.");
    };

    request.onerror = function (event) {
        alert("Unable to add data!");
    }
}

function readAll() {
    var objectStore = db.transaction("games").objectStore("games");
    document.getElementById("previousGames").innerHTML = "Score Board:<br>";

    objectStore.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;

        if (cursor) {
            document.getElementById("previousGames").innerHTML += "Id: " + cursor.key + " Nick: " + cursor.value.nick + " Score: " + cursor.value.score + " Time: " + cursor.value.time + " sec <br />";
            playerId = cursor.key;
            cursor.continue();
        } else {
            playerId += 1;
        }
    };
}

function calculateBallSpeed(ball, paddle) {
    var c = 0;
    var g = ((ball.x - paddle.x) / (paddle.width));
    if (g <= 0.1) c = 3;
    if (g > 0.1 && g <= 0.3) c = 2;
    if (g > 0.3 && g <= 0.4) c = 1.5;
    if (g > 0.4 && g <= 0.6) c = 1;
    if (g > 0.6 && g <= 0.7) c = 1.5;
    if (g > 0.7 && g <= 0.9) c = 2;
    if (g > 0.9) c = 3;

    return c;
}

function bonusResizePaddle() {
    paddle.width = paddle.width * bonusPaddleIncrease;
    window.setTimeout(() => { paddle.width = defaultPaddleWidth }, 5000);
}

function bonusShrinkPaddle() {
    paddle.width = paddle.width * bonusPaddleShrink;
    window.setTimeout(() => { paddle.width = defaultPaddleWidth }, 5000);
}

function bonusPointsTimesTwo() {
    currentPointsPerBlock = 2;
    window.setTimeout(() => { currentPointsPerBlock = defaultPointsPerBlock }, 5000);
}

function bonusPointsTimesFive() {
    currentPointsPerBlock = 5;
    window.setTimeout(() => { currentPointsPerBlock = defaultPointsPerBlock }, 5000);
}

function bonusReverseControl() {
    isControlReversed = true;
    window.setTimeout(() => { isControlReversed = false }, 5000);
}

function initBonuses() {
    bonusHandlers.push(() => { bonusResizePaddle() });
    bonusHandlers.push(() => { bonusPointsTimesTwo() });
    bonusHandlers.push(() => { bonusPointsTimesFive() });
    bonusHandlers.push(() => { bonusShrinkPaddle() });
    bonusHandlers.push(() => { bonusReverseControl() });

    bonusLabels.push("IncSize");
    bonusLabels.push("Pts x 2");
    bonusLabels.push("Pts x 5");
    bonusLabels.push("DecSize");
    bonusLabels.push("Reverse");
}

function generateNewBall() {
    var ball = new Ball(
        ballRadius,
        ballColors[Math.floor(Math.random() * ballColors.length)],
        Math.random() * canvasWidth,
        ballSpawnAreaYmin + Math.random() * (ballSpawnAreaYmax - ballSpawnAreaYmin)
    );
    return ball;
}

function checkBallToBallCollision(ball) {
    balls.forEach(secondBall => {
        if (ball.x == secondBall.x && ball.y == secondBall.y) return;
        if (Math.sqrt(Math.pow(ball.x - secondBall.x, 2) + Math.pow(ball.y - secondBall.y, 2)) <= ball.ballRadius + secondBall.ballRadius) {
            collideBalls(ball, secondBall);
        }
    });
}

function checkBallToBlockCollision(ball) {
    blocks.forEach(element => {
        if ((element.visible) &&
            (ball.x > element.bottomLeft[0] && ball.x < element.bottomRight[0]) &&
            ((ball.y + ball.ballRadius) > element.bottomLeft[1] && ball.y < element.topLeft[1])) {
            gameScore += currentPointsPerBlock;
            applySpecialBlockLogic(element);
            element.visible = false;
            ball.speedY = -ball.speedY;
            if (gameMode == 1) {
                element.timeInvisible = performance.now();
            }
        }
    });
}

function collideBalls(ball1, ball2) {
    let angle = Math.atan2(ball1.x - ball2.x, ball1.y - ball2.y);

    let speed1 = Math.sqrt(ball1.speedX * ball1.speedX + ball1.speedY * ball1.speedY);
    let speed2 = Math.sqrt(ball2.speedX * ball2.speedX + ball2.speedY * ball2.speedY);

    let direction1 = Math.atan2(ball1.speedY, ball1.speedX);
    let direction2 = Math.atan2(ball2.speedY, ball2.speedX);

    let velocityx1 = speed1 * Math.cos(direction1 - angle);
    let velocityy1 = speed1 * Math.sin(direction1 - angle);
    let velocityx2 = speed2 * Math.cos(direction2 - angle);
    let velocityy2 = speed2 * Math.sin(direction2 - angle);

    ball1.speedX = Math.cos(angle) * velocityx2 + Math.cos(angle + Math.PI / 2) * velocityy1;
    ball1.speedY = Math.sin(angle) * velocityx2 + Math.sin(angle + Math.PI / 2) * velocityy1;
    ball2.speedX = Math.cos(angle) * velocityx1 + Math.cos(angle + Math.PI / 2) * velocityy2;
    ball2.speedY = Math.sin(angle) * velocityx1 + Math.sin(angle + Math.PI / 2) * velocityy2;

    ball1.x = (ball1.x += ball1.speedX);
    ball1.y = (ball1.y += ball1.speedY);
    ball2.x = (ball2.x += ball2.speedX);
    ball2.y = (ball2.y += ball2.speedY);
}

function updateGameArea() {
    document.getElementById("currentGame").innerHTML = "Good luck " + nick + "! Your score is " + gameScore + " !";
    myGameArea.clear();
    paddle.newPos();
    blocks.forEach(element => element.update());
    bonuses.forEach(x => x.newPos());
    balls.forEach(one => one.newPos());
    paddle.update();
    balls.forEach(one => one.update());
    bonuses.forEach(x => x.update());
}