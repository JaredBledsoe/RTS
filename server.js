
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const PORT = process.env.PORT || 3000;

const app = express(); 
// app.use('/', express.static('./public'));

const INDEX = path.join(__dirname, 'index.html');
const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
const wss = new SocketServer({ server });

var clients = [];
var players = [];
var grids = [];
// var updatedGrids = [];

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

	function close() {
		var currentId = clients.indexOf(ws);
		for (var i=0; i<grids.length; i++) {
			if (grids[i].owner === players[currentId].id) {
				grids[i].reset();
			}
		}
		clients[currentId].close();
		clients.splice(currentId, 1);
		players.splice(currentId, 1);
	}

    ws.on('close', function() {
    	close();
    });

    ws.on('error', function() {
    	close();
    });
	
	ws.on('message', function(e) {
		var message = JSON.parse(e);

		//Player moved
		if (message.type == 'playerUpdate') {
			var currentId;
			for (var i=0; i<players.length; i++) {
				if (players[i].id == message.info.id) {
					currentId = i;
					break;
				}
			}
			if (players[currentId]) {
				players[currentId].moves = message.info.moves;
			}
		}
	});

	clients.push(ws);
	players.push(new Player());

	//Send to new player
	ws.send(JSON.stringify({
		type: 'initPlayer',
		player: players[players.length-1],
		grids: grids
	}));
});










//Send grids to players
setInterval(function() {
	for (var i=0; i<players.length; i++) {
        if (clients[i].readyState != clients[0].OPEN) {
        	console.log("error asdkasdjklasdjklsadljksadljkaslkd");
        }
        else {
			players[i].update();
			
			clients[i].send(JSON.stringify({
				type: 'gameUpdate',
				player: players[i],
				grids: players[i].gridsInView
			}));
		}
	}
},30);










function Player() {
	this.x = 300;
	this.y = 150;
	this.id = Math.random();
	this.gridId = 402;
	this.lastGridId = 0;
	this.moves = [false, false, false, false];
	this.rgb = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];
	this.contesting = false;
	this.smooth = [0, 0];

	this.gridsInView = [];
	this.viewStartGrid = 0;
	this.viewStartGrid = 2030;

};
Player.prototype.update = function() {

	var index;
	for (var i=0; i<players.length; i++) {
		if (players[i].id == this.id) {
			index = i;
			break;
		}
	}

	//Movement
	// var currentGridId = this.y/50 + (this.x/50 * 100);
	if (this.contesting === false) {
		if (this.moves[0] && this.y>0 && grids[this.gridId-1].rock != 101) {
			this.contesting = true;
			grids[this.gridId-1].own(index, this.id);
			this.smooth = ['up', grids[this.gridId-1].delay];
		}
		else if (this.moves[1] && this.x<4950 && grids[this.gridId+100].rock != 101) {
			this.contesting = true;
			grids[this.gridId+100].own(index, this.id);
			this.smooth = ['right', grids[this.gridId+100].delay];
		}
		else if (this.moves[2] && this.y<4950 && grids[this.gridId+1].rock != 101) {
			this.contesting = true;
			grids[this.gridId+1].own(index, this.id);
			this.smooth = ['down', grids[this.gridId+1].delay];
		}
		else if (this.moves[3] && this.x>0 && grids[this.gridId-100].rock != 101) {
			this.contesting = true;
			grids[this.gridId-100].own(index, this.id);
			this.smooth = ['left', grids[this.gridId-100].delay];
		}
	}

	//Which blocks to show, based on position
	this.viewStartGrid = this.gridId-1308;

	this.viewEndGrid = this.gridId+1208;

	this.gridsInView = [];

	for (var i=this.viewStartGrid; i<=this.viewEndGrid; i++) {
		if (grids[i]) {
			if (grids[i].y > this.y-450 && grids[i].y < this.y+350) {
				this.gridsInView.push(grids[i]);
			}
		}
	}
};





function Grid(x, y) {
	this.owner = false;
	this.x = x;
	this.y = y;
	this.gridId = this.y/50 + (this.x/50 * 100);
	this.rgb;
	this.occupied = false;
	this.rock = Math.floor((Math.random()*100)+1);
	this.delay;
	this.cracks = 0;
	this.contesting = false;

	if (this.x == 0 || this.y == 0 || this.x == 4950 || this.y == 4950) {
		this.rock = 101;
	}

	this.rock <= 75 ? this.delay = 300 :
	this.rock <= 95 ? this.delay = 600 :
	this.rock <= 99 ? this.delay = 900 : this.delay = 2000;
}
Grid.prototype.own = function(index, id) {	

	if (this.owner !== id) {
		this.owner = true;
		this.contesting = true;

	setTimeout(() => {
		this.cracks = 1;
	},this.delay*.33);

	setTimeout(() => {
		this.cracks = 2;
	},this.delay*.66);

		setTimeout(() => {
			if (players[index]) {
				this.owner = id;
				this.rgb = players[index].rgb;
				this.occupied = true;
				this.delay = 200;
				this.cracks = 0;
				this.contesting = false;
				grids[players[index].lastGridId].occupied = false;
				
				players[index].lastGridId = this.gridId;				
				players[index].gridId = this.gridId;
				players[index].x = this.x;
				players[index].y = this.y;
				players[index].contesting = false;
				players[index].smooth = [0, 0];

				clients[index].send(JSON.stringify({
					type: 'claimGrid',
					grid: this
				}));				
			}
		},this.delay);
	}
	else if (this.owner === id) {
		setTimeout(() => {
			this.occupied = true;
			grids[players[index].lastGridId].occupied = false;
		
			players[index].lastGridId = this.gridId;				
			players[index].gridId = this.gridId;
			players[index].smooth = [0, 0];
			players[index].x = this.x;
			players[index].y = this.y;
			players[index].contesting = false;
		},200);
	}
}
Grid.prototype.reset = function() {
	this.owner = false;
	this.gridId = this.y/50 + (this.x/50 * 100);
	this.rgb;
	this.occupied = false;
	this.rock = Math.floor((Math.random()*100)+1);
	this.delay;
	this.cracks = 0;
	this.contesting = false;

	this.rock <= 75 ? this.delay = 300 :
	this.rock <= 95 ? this.delay = 600 :
	this.rock <= 99 ? this.delay = 900 : this.delay = 2000;
}