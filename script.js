
var paddle;
var gameStarted = false;
var gameStopped = false;
var gameScore = 0;
var targets = [];
var nick;
var startTime;
var endTime;
var elapsedTime;
var id = 0;

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB ||
    window.msIndexedDB;

window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
    window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange ||
    window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.")
}

var db;
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
}

function startGame() {
    if (!gameStarted) {
        readAll();
        startTime = performance.now();
        let person = prompt("Please enter your name:", "Your Name");
        if (person == null || person == "") {
            alert("User cancelled the prompt or entered wrong name");
        } else {
            nick = person;
            paddle = new paddleBuilder(120, 15, 260, 580);
            ball = new ballBuilder(8, "blue", paddle.x + 100, paddle.y - paddle.height);
            targets = generateTargetLocations();
            myGameArea.start();
            gameStarted = true;
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
            gameStopped = false;
        } else {
            clearInterval(myGameArea.interval);
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
    canvas: document.createElement("canvas"),
    start: function () {
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.interval = setInterval(updateGameArea, 10);
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

function paddleBuilder(width, height, x, y) {
    var img = new Image();
    img.src = "paddle.jpg";
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.update = function () {
        ctx = myGameArea.context;
        var pat = ctx.createPattern(img, "repeat");
        ctx.fillStyle = pat;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    this.newPos = function () {
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

function targetBuilder(width, height, x, y) {
    var img = new Image();
    img.src = "target.jpg";
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.visible = true;
    this.bottomLeft = [x, y]
    this.bottomRight = [x + width, y]
    this.topRight = [x + width, y + height]
    this.topLeft = [x, y + height]
    this.update = function () {
        ctx = myGameArea.context;
        var pat = ctx.createPattern(img, "repeat");
        if (this.visible) {
            ctx.fillStyle = pat;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

function ballBuilder(ballRadius, color, x, y) {
    this.ballRadius = ballRadius;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y + this.ballRadius;
    this.dx = 2;
    this.dy = -2;
    this.update = function () {
        ctx.beginPath();
        ctx = myGameArea.context;
        ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    }
    this.newPos = function () {
        targets.forEach(element => {
            if
                (
                (element.visible) &&
                (this.x > element.bottomLeft[0] && this.x < element.bottomRight[0]) &&
                ((this.y + this.ballRadius) > element.bottomLeft[1] && this.y < element.topLeft[1])
            ) {
                gameScore++;
                element.visible = false;
            }
        });
        if (this.x + this.dx > myGameArea.canvas.width - this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.dx = -this.dx;
        }
        if (this.y + this.dy < this.ballRadius) {
            this.dy = -this.dy;
        } else if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius - paddle.height) {
            if (this.x > paddle.x && this.x < paddle.x + paddle.width) {
                this.dy = -this.dy;
            }
            else {
                if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius) {
                    endTime = performance.now()
                    var timeDiff = endTime - startTime;
                    timeDiff /= 1000;
                    elapsedTime = timeDiff.toFixed(2);
                    alert("GAME OVER!! You were playing " + elapsedTime + " seconds!");
                    addToDatabase();
                    document.location.reload();
                    clearInterval(myGameArea.interval);
                }
            }
        }

        this.x += this.dx;
        this.y += this.dy;
    }
}

function updateGameArea() {
    document.getElementById("currentGame").innerHTML = "Hello " + nick + "! You have " + gameScore + " points!!";
    myGameArea.clear();
    paddle.newPos();
    ball.newPos();
    paddle.update();
    ball.update();
    targets.forEach(element => element.update());
}

function moveleft() {
    paddle.speedX = -2;
}

function moveright() {
    paddle.speedX = 2;
}

function clearmove() {
    paddle.speedX = 0;
    paddle.speedY = 0;
}

document.onkeydown = checkkey;
document.onkeyup = clearmove;

function checkkey(e) {
    if (e.keyCode == '37') {
        moveleft();
    } else if (e.keyCode == '39') {
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
            targets.push(new targetBuilder(40, 20, 40 + shiftX, 40 + shiftY));
            shiftX += 55;
        }
        shiftX = 0;
        shiftY += 35;
    }
    return targets;
}

function addToDatabase() {
    id += 1;
    var request = db.transaction(["games"], "readwrite")
        .objectStore("games")
        .add({ id: id, nick: nick, score: gameScore, time: elapsedTime });

    request.onsuccess = function (event) {
        alert("Game has been added to your database.");
    };

    request.onerror = function (event) {
        alert("Unable to add data!");
    }
}

function readAll() {
    var objectStore = db.transaction("games").objectStore("games");

    objectStore.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;

        if (cursor) {
            document.getElementById("previousGames").innerHTML += "\nId: " + cursor.key + " Nick: " + cursor.value.nick + " Score: " + cursor.value.score + " Time: " + cursor.value.time;
            cursor.continue();
        } else {

        }
    };
}

