const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const PORT = process.env.PORT || 3000;

//const app = express(); 
//app.use('/', express.static('./public'));

const INDEX = path.join(__dirname, 'index.html');
const server = express()
    .use("/", (req, res) => res.sendFile(INDEX))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));
const wss = new SocketServer({ server });

var clients = [];
var players = [];
var grids = [];
var updatedGrids = [];

//Init grids
for (var x = 0; x < 5000; x += 50) {
    for (var y = 0; y < 5000; y += 50) {
        grids.push(new Grid(x, y));
    }
}










wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

wss.on('connection', function(ws) {

    function close() {
        try {
            var currentId = clients.indexOf(ws);
            for (var i = 0; i < grids.length; i++) {
                if (grids[i].owner === players[currentId].id) {
                    grids[i].reset();
                }
            }
            grids[players[currentId].baseGrid - 1].reset();
            grids[players[currentId].baseGrid + 99].reset();
            grids[players[currentId].baseGrid + 100].reset();
            grids[players[currentId].baseGrid + 101].reset();
            grids[players[currentId].baseGrid + 1].reset();
            grids[players[currentId].baseGrid - 99].reset();
            grids[players[currentId].baseGrid - 100].reset();
            grids[players[currentId].baseGrid - 101].reset();

            clients.splice(currentId, 1);
            players.splice(currentId, 1);
        } catch (e) {
            console.log(e);
        }
    }

    ws.on('close', function() {
        close();
    });

    ws.on('error', function() {
        close();
    });

    ws.on('message', function(e) {
        try {
            var message = JSON.parse(e);
            var playerId = message.id;

            //Get client's id
            var currentId;
            for (var i = 0; i < players.length; i++) {
                if (players[i].id == playerId) {
                    currentId = i;
                    break;
                }
            }

            //Player moved
            if (message.type == 'playerUpdate') {
                if (players[currentId]) {
                    players[currentId].move = message.move;
                }
            }
            //Player sent message
            else if (message.type == 'chat') {
                players[currentId].chat(message.info);
            }
            //Player build
            else if (message.type == 'build' && grids[players[currentId].gridId].owner == players[currentId].id) {
                if (grids[players[currentId].gridId].rock < 1000) {
                    var cost = message.build == 0 ? 10 :
                        message.build == 1 ? 5 :
                        message.build == 2 ? 3 :
                        message.build == 3 ? 1 : 0;
                } else if (message.build == 2 && grids[players[currentId].gridId].rock < 1004) {
                    var cost = grids[players[currentId].gridId].rock == 1001 ? 5 :
                        grids[players[currentId].gridId].rock == 1002 ? 3 :
                        grids[players[currentId].gridId].rock == 1003 ? 1 : 0;
                } else if (message.build == 0 && grids[players[currentId].gridId].rock >= 1000) {
                    var cost = grids[players[currentId].gridId].rock == 1001 ? 5 :
                        grids[players[currentId].gridId].rock == 1002 ? 3 :
                        grids[players[currentId].gridId].rock == 1003 ? 2 : 0;

                    var slot = grids[players[currentId].gridId].rock == 1001 ? 0 :
                        grids[players[currentId].gridId].rock == 1002 ? 1 :
                        grids[players[currentId].gridId].rock == 1003 ? 2 :
                        grids[players[currentId].gridId].rock == 1004 ? 3 : 4;


                    players[currentId].stones[slot] += cost;
                    cost = 0;

                    grids[players[currentId].gridId].rock = 0;
                    updatedGrids.push(grids[players[currentId].gridId]);

                    clients[currentId].send(JSON.stringify({
                        type: 'closeHUD'
                    }));
                }

                var slot = cost == 10 ? 0 :
                    cost == 5 ? 1 :
                    cost == 3 ? 2 :
                    cost == 1 ? 3 : 0;

                if (players[currentId].stones[slot] >= cost && cost) {
                    var wall = cost == 10 ? 1001 :
                        cost == 5 ? 1002 :
                        cost == 3 ? 1003 :
                        cost == 1 ? 1004 : 0;

                    players[currentId].stones[slot] -= cost;
                    grids[players[currentId].gridId].reset(wall, players[currentId].id);

                    clients[currentId].send(JSON.stringify({
                        type: 'closeHUD'
                    }));
                }
            }

        } catch (e) {
            console.log(e);
        }
    });

    function getSpawnGrid() {
        var successful = true;
        var randGrid = Math.floor(Math.random() * 9000) + 500;

        for (var i = 0; i < players.length;) {
            if (Math.abs(grids[players[i].baseGrid].x - grids[randGrid].x) >= 200 && Math.abs(grids[players[i].baseGrid].y - grids[randGrid].y) >= 4) {
                i++;
            } else {
                console.log(randGrid + ' ' + players[i].baseGrid);
                i = 0;
                randGrid = Math.floor(Math.random() * 9000) + 500;
                successful = false;
            }
        }

        if (grids[randGrid].owner === false && grids[randGrid].rock <= 980 && randGrid.toString().slice(-2) > 5 && randGrid.toString().slice(-2) < 95 && successful === true) {

            grids[randGrid - 1].reset('980');
            grids[randGrid + 99].reset('1003');
            grids[randGrid + 100].reset('980');
            grids[randGrid + 101].reset('1003');
            grids[randGrid + 1].reset('980');
            grids[randGrid - 99].reset('1003');
            grids[randGrid - 100].reset('980');
            grids[randGrid - 101].reset('1003');
            grids[randGrid].reset('990');

            clients.push(ws);

            players.push(new Player(grids[randGrid].x, grids[randGrid].y, randGrid));

            //Send to new player
            ws.send(JSON.stringify({
                type: 'initPlayer',
                player: players[players.length - 1],
                grids: grids
            }));
        } else {
            getSpawnGrid();
        }
    }
    getSpawnGrid();
});










//Send grids to players
setInterval(function() {
    try {
        var minimizedPlayers = [];
        for (var i = 0; i < players.length; i++) {
            minimizedPlayers.push([players[i].x, players[i].y, players[i].message]);
        }
        for (var i = 0; i < players.length; i++) {
            players[i].update();

            var minimizedPlayer = [players[i].x, players[i].y, players[i].gridId, players[i].smoothMoving, players[i].stones];

            clients[i].send(JSON.stringify({
                type: 'gameUpdate',
                player: minimizedPlayer,
                updatedGrids: updatedGrids,
                players: minimizedPlayers
            }));
        }
        updatedGrids = [];
    } catch (e) {
        console.log(e);
    }
}, 30);











function Player(x, y, gridId) {
    this.stuff = false;
    this.x = x;
    this.y = y;
    this.id = Math.random();
    this.gridId = gridId;
    this.baseGrid = gridId;
    this.lastGridId = gridId;
    this.move = [-1, 0];
    this.rgb = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
    this.contesting = false;
    this.smooth = null;
    this.stones = [666, 777, 888, 999];
    this.smoothMoving = false;
    this.message;
};
Player.prototype.update = function() {
    var index = players.indexOf(this);

    try {
        //WASD or arrows
        if (this.contesting === false && this.move[0] >= 0) {
            var dir = this.move[0] == 0 ? -1 :
                this.move[0] == 1 ? 100 :
                this.move[0] == 2 ? 1 :
                this.move[0] == 3 ? -100 : 0;

            if (grids[this.gridId + dir].rock <= 990 || grids[this.gridId + dir].owner == this.id) {
                grids[this.gridId + dir].own(index, this.id);
                this.contesting = true;
                this.smooth = dir;
            }
            //Attacking structure
            else if (grids[this.gridId + dir].rock > 1000) {
                grids[this.gridId + dir].playerAttack(index);
            }
        }

    } catch (e) {
        console.log(e);
    }
};
Player.prototype.chat = function(message) {
    try {
        if (!this.message) {
            this.message = message.length > 45 ? this.message = 'Wow this is a really cool game!' : message;

            var hide = setTimeout(() => {
                this.message = '';
            }, 4500);
        }
    } catch (e) {
        console.log(e);
    }
};












function Grid(x, y) {
    this.owner = false;
    this.x = x;
    this.y = y;
    this.gridId = this.y / 50 + (this.x / 50 * 100);
    this.rgb;
    this.occupied = false;
    this.rock = Math.floor((Math.random() * 1000) + 1);
    this.image;
    this.message;
    this.delay;
    this.cracks = 0;
    this.building = false;
    this.health = 40;

    if (this.x == 0 || this.y == 0 || this.x == 4950 || this.y == 4950) {
        this.rock = 1000;
    }

    this.rock <= 750 ? this.delay = 300 :
        this.rock <= 950 ? this.delay = 600 :
        this.rock <= 980 ? this.delay = 900 :
        this.rock <= 990 ? this.delay = 2100 :
        this.rock <= 1000 ? this.delay = 0 : this.delay = 0;

    this.rock <= 750 ? this.image = 0 :
        this.rock <= 950 ? this.image = 1 :
        this.rock <= 980 ? this.image = 2 :
        this.rock <= 990 ? this.image = 3 :
        this.rock <= 1000 ? this.image = 4 : this.image = 4;
};
Grid.prototype.own = function(index, id) {
    try {
        //Move camera smoothly
        var oldGridId = players[index].gridId;
        // var interval = grids[oldGridId + players[index].smooth].rock > 980 && grids[oldGridId + players[index].smooth].rock <= 990 ? 42 : grids[oldGridId + players[index].smooth].delay / 25;
        var dist = grids[oldGridId + players[index].smooth].rock > 980 && grids[oldGridId + players[index].smooth].rock <= 990 ? 1 : 2;

        if (this.owner !== id) {
            this.owner = true;
        }

        try {
            var smoothCamera = setInterval(() => {
                try {
                    if (Math.abs(players[index].x - this.x) <= 0 && Math.abs(players[index].y - this.y) <= 0) {
                        clearInterval(smoothCamera);

                        if (this.owner !== id) {
                            var slot = this.rock <= 750 ? 0 :
                                this.rock <= 950 ? 1 :
                                this.rock <= 980 ? 2 :
                                this.rock <= 990 ? 3 : 0;
                            players[index].stones[slot]++;

                            this.rock = 0;
                            this.owner = id;
                            this.rgb = players[index].rgb;
                            this.delay = 200;
                        }

                        this.occupied = true;
                        grids[players[index].lastGridId].occupied = false;

                        players[index].smoothMoving = false;
                        players[index].gridId = this.gridId;
                        players[index].x = this.x;
                        players[index].y = this.y;
                        players[index].contesting = false;
                        players[index].smooth = null;

                        updatedGrids.push(grids[players[index].lastGridId]);
                        players[index].lastGridId = this.gridId;
                        updatedGrids.push(this);
                    }
                    if (players[index].smooth === -1) {
                        players[index].y -= 1;
                    } else if (players[index].smooth === 100) {
                        players[index].x += 1;
                    } else if (players[index].smooth === 1) {
                        players[index].y += 1;
                    } else if (players[index].smooth === -100) {
                        players[index].x -= 1;
                    }
                } catch (e) {
                    clearInterval(smoothCamera);
                    console.log(e);
                }
            }, this.delay / 50);
        } catch (e) {
            console.log(e);
        }

    } catch (e) {
        console.log(e);
    }
};
Grid.prototype.playerAttack = function(index) {

    var damage = this.image == 5 ? .30 :
        this.image == 6 ? .20 :
        this.image == 7 ? .10 :
        this.image == 8 ? .04 : 0;

    if (Math.trunc(this.health) == 40) {
        this.heal(damage);
    }
    this.health -= damage;

    if (this.health <= 0) {
        var stoneReceived = this.image == 5 ? 7 :
            this.image == 6 ? 4 :
            this.image == 7 ? 2 : 0;
        players[index].stones[this.image - 5] += stoneReceived;

        this.rock = 0;
        this.owner = players[index].id;
        this.rgb = players[index].rgb;
        this.delay = 200;
        updatedGrids.push(this);


        console.log('attack over');
    }
    updatedGrids.push(this);
};
Grid.prototype.heal = function(damage) {
    setTimeout(() => {
        var healing = setInterval(() => {
            if (Math.trunc(this.health) < 40) {
                this.health += damage;
            } else if (Math.trunc(this.health) == 40) {
                this.health = 40;
                clearInterval(healing);
            }
            updatedGrids.push(this);
        }, 1000);
    }, 2100);
};
Grid.prototype.reset = function(rock, id) {
    try {
        this.owner = id ? id : false;
        this.gridId = this.y / 50 + (this.x / 50 * 100);
        this.rgb;
        this.occupied = false;
        this.rock = rock ? rock : Math.floor((Math.random() * 1000) + 1);
        this.cracks = 0;

        if (!id) {
            this.rock <= 750 ? this.delay = 300 :
                this.rock <= 950 ? this.delay = 600 :
                this.rock <= 980 ? this.delay = 900 :
                this.rock <= 990 ? this.delay = 2100 :
                this.rock <= 1000 ? this.delay = 0 : this.delay = 0;
        } else if (id) {
            this.delay = 200;
        }

        this.rock <= 750 ? this.image = 0 :
            this.rock <= 950 ? this.image = 1 :
            this.rock <= 980 ? this.image = 2 :
            this.rock <= 990 ? this.image = 3 :
            this.rock <= 1000 ? this.image = 4 :
            this.rock == 1001 ? this.image = 5 :
            this.rock == 1002 ? this.image = 6 :
            this.rock == 1003 ? this.image = 7 :
            this.rock == 1004 ? this.image = 8 : 0;

        this.health = 40;

        updatedGrids.push(this);
    } catch (e) {
        console.log(e);
    }
};
