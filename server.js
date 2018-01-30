
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');
const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
const wss = new SocketServer({ server });
var clients = [];
var players = [];
var grids = [];
var updatedGrids = [];


//Init grids
for (var x=0; x<5000; x+=50) {
	for (var y=0; y<5000; y+=50) {
		grids.push(new Grid(x,y));
	}
}


wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});


wss.on('connection', function(ws) {
	clients.push(ws);

	players.push(new Player());
	
	ws.on('message', function(e) {
		var message = JSON.parse(e);

		//Player moved
		if (message.type == 'playerUpdate') {
			if (players[message.info.id]) {
				players[message.info.id].moves = message.info.moves;
			}
		}

		//Player left
		if (message.type == 'close') {
			clients[message.id].close();
			clients.splice(message.id, 1);
			players.splice(message.id, 1);
		}
	});

	ws.send(JSON.stringify({
		type: 'initPlayer',
		player: players[players.length-1],
		grids: grids
	}));
});





//Run game physics
setInterval(function() {
	for (var i=0; i<players.length; i++) {
		if (clients[i]) {
			players[i].update();
			clients[i].send(JSON.stringify({
				type: 'gameUpdate',
				players: players,
				grids: updatedGrids
			}));
		}
		if (i >= players.length) {
			updatedGrids = [];
		}
	}
},30);





function Player() {
	this.x = 50;
	this.y = 50;
	this.id = clients.length-1;
	this.gridId = 102;
	this.moves = [false, false, false, false];
	this.contesting = false;
};
Player.prototype.update = function() {

	//Movement
	// var currentGridId = this.y/50 + (this.x/50 * 100);
	if (this.moves[0] && this.contesting===false && (this.gridId-1)%100!=0) {
		grids[this.gridId-1].own(this.id);
	}
	else if (this.moves[1] && this.contesting===false && (this.gridId+100)<9900) {
		grids[this.gridId+100].own(this.id, this.moves);
	}
	else if (this.moves[2] && this.contesting===false && (this.gridId+1)%99!=0) {
		grids[this.gridId+1].own(this.id, this.moves);
	}
	else if (this.moves[3] && this.contesting===false && (this.gridId-100)>99) {
		grids[this.gridId-100].own(this.id, this.moves);
	}
	else if (this.contesting===true) {

	}
};





function Grid(x, y) {
	this.owner = false;
	this.x = x;
	this.y = y;
	this.gridId = this.y/50 + (this.x/50 * 100);
}
Grid.prototype.own = function(id) {	
	this.owner = true;
	players[id].contesting = true;
	updatedGrids.push(this);

	setTimeout(() => {
		players[id].contesting = false;
		updatedGrids.push(this);

		console.log(this.gridId + " " + this.y);
		this.owner = id;

		players[id].gridId = this.gridId;
		players[id].x = this.x;
		players[id].y = this.y;

	},100);
}

















