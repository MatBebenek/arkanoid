
var paddle;
var gameStarted = false;
var gameStopped = false;

function startGame() {
    if(!gameStarted){
        paddle = new paddleBuilder(200, 10, "red", 200, 580);
        ball = new ballBuilder(8, "blue", paddle.x + 100, paddle.y - paddle.height);
        myGameArea.start();
        gameStarted = true;
    } else {
        gameStarted = false;
        gameStopped = false;
        changeToResume();
        newGame();
    }
}

function stopGame() {
    if(gameStarted){
        if(gameStopped){
            myGameArea.interval = setInterval(updateGameArea, 10);
            gameStopped = false;
        } else {
            clearInterval(myGameArea.interval);
            gameStopped = true;
        }
    }
}

function newGame() {
    if(!gameStopped){
        clearInterval(myGameArea.interval);
        startGame();
    } 
}

var myGameArea = {
    canvas : document.createElement("canvas"),
    start : function() {
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.interval = setInterval(updateGameArea, 10);
    },
    clear : function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

function paddleBuilder(width, height, color, x, y) {
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;    
    this.x = x;
    this.y = y;    
    this.update = function() {
        ctx = myGameArea.context;
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    this.newPos = function() {
        this.x += this.speedX;
        if(this.x < 0) {
            this.x = 0;
            clearmove();
        }
        if(this.x > myGameArea.canvas.width - this.width){
            this.x = myGameArea.canvas.width - this.width;
            clearmove();
        }
        this.y += this.speedY;
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
    this.update = function() {
        ctx.beginPath();
        ctx = myGameArea.context;
        ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    }
    this.newPos = function() {
        if(this.x + this.dx > myGameArea.canvas.width-this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.dx = -this.dx;
        }
        if(this.y + this.dy < this.ballRadius) {
            this.dy = -this.dy;
        } else if(this.y + this.dy > myGameArea.canvas.height-this.ballRadius - paddle.height) {
            if(this.x > paddle.x && this.x < paddle.x + paddle.width) {
                this.dy = -this.dy;
            }
            else {
                if(this.y + this.dy > myGameArea.canvas.height-this.ballRadius) {
                    alert("GAME OVER");
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
    myGameArea.clear();
    paddle.newPos();    
    ball.newPos();
    paddle.update();
    ball.update();
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

function checkkey(e){
    if(e.keyCode == '37') {
         moveleft();
    } else if (e.keyCode == '39') { 
        moveright();
    }
}

function changeNewGame() {
    var btn = document.getElementById("startButton");
    btn.innerHTML = 'NEW GAME';
}

function changeToResume(){
    var btn = document.getElementById("stopButton");
    if(btn.innerHTML == "STOP" && gameStarted){
        btn.innerHTML = "RESUME";
    } else {
        btn.innerHTML = "STOP";
    }
}