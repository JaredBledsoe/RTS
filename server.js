
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

	function close() {
		try {
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
		catch (e) {
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

			//Get client's id
			var currentId;
			for (var i=0; i<players.length; i++) {
				if (players[i].id == message.info.id) {
					currentId = i;
					break;
				}
			}

			//Player moved
			if (message.type == 'playerUpdate') {
				if (players[currentId]) {
					players[currentId].moves = message.info.moves;
				}
			}

			else if (message.type == 'initPlayer') {
				players[currentId].canvasWidth = message.info.canvasWidth;
				players[currentId].canvasHeight = message.info.canvasHeight;
			}
		}
		catch (e) {
			console.log(e);
		}
	});

	try {
		clients.push(ws);
		players.push(new Player());

		//Send to new player
		ws.send(JSON.stringify({
			type: 'initPlayer',
			player: players[players.length-1],
			grids: grids
		}));
	}
	catch (e) {
		console.log(e);
	}
});










//Send grids to players
setInterval(function() {
	try {
		for (var i=0; i<players.length; i++) {
			players[i].update();
			
			clients[i].send(JSON.stringify({
				type: 'gameUpdate',
				player: players[i],
				updatedGrids: updatedGrids
			}));
		}
		updatedGrids = [];
	}
	catch (e) {
		console.log(e);
	}
},30);










function Player() {
	this.stuff = false;
	this.x = 50;
	this.y = 50;
	this.id = Math.random();
	this.gridId = 101;
	this.lastGridId = 0;
	this.moves = [false, false, false, false];
	this.rgb = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];
	this.contesting = false;
	this.smooth = [0, 0, 0, 0];
	this.canvasWidth;
	this.canvasHeight;
	this.smoothMoving = false;

	this.viewStartGrid = 0;
	this.viewEndGrid = 2030;
};
Player.prototype.update = function() {
	var index = players.indexOf(this);

	//Movement
	try {
		if (this.contesting === false) {
			if (this.moves[0] && this.y>0 && grids[this.gridId-1].rock != 101) {
				this.contesting = true;
				grids[this.gridId-1].own(index, this.id);
				this.smooth = ['up', grids[this.gridId-1].delay, grids[this.gridId-1].x, grids[this.gridId-1].y];
			}
			else if (this.moves[1] && this.x<4950 && grids[this.gridId+100].rock != 101) {
				this.contesting = true;
				grids[this.gridId+100].own(index, this.id);
				this.smooth = ['right', grids[this.gridId+100].delay, grids[this.gridId+100].x, grids[this.gridId+100].y];
			}
			else if (this.moves[2] && this.y<4950 && grids[this.gridId+1].rock != 101) {
				this.contesting = true;
				grids[this.gridId+1].own(index, this.id);
				this.smooth = ['down', grids[this.gridId+1].delay, grids[this.gridId+1].x, grids[this.gridId+1].y];
			}
			else if (this.moves[3] && this.x>0 && grids[this.gridId-100].rock != 101) {
				this.contesting = true;
				grids[this.gridId-100].own(index, this.id);
				this.smooth = ['left', grids[this.gridId-100].delay, grids[this.gridId-100].x, grids[this.gridId-100].y];
			}
		}

		//Move camera smoothly
	    if (typeof this.smooth[0] === 'string' && this.smoothMoving === false) {
	    	this.smoothMoving = true;

	    	var smoothCamera = setInterval(() => {
				if (this.smooth[0] === 'up') {
		          this.y-=2;
		        }
		        else if (this.smooth[0] === 'right') {
		          this.x+=2;
		        }
		        else if (this.smooth[0] === 'down') {
		          this.y+=2;
		        }
		        else if (this.smooth[0] === 'left') {
		          this.x-=2;
		        }

		        if (Math.abs(this.x-this.smooth[2]) <= 6 && Math.abs(this.y-this.smooth[3]) <= 6) {
		        	iterations = 1;
		        	this.smoothMoving = false;
		        	this.smooth = [0, 0, 0, 0];
		        	clearInterval(smoothCamera);
		        }
	    	}, this.smooth[1]/25);
		}

		//Which blocks to show, based on position
		this.viewStartGrid = this.gridId-Math.floor(this.canvasWidth)-Math.floor(this.canvasHeight/100)-96 > 0 ? this.viewStartGrid = this.gridId-Math.floor(this.canvasWidth)-Math.floor(this.canvasHeight/100)-96 : 0;
		this.viewEndGrid = this.gridId+Math.floor(this.canvasWidth)+Math.floor(this.canvasHeight/100)+96 < grids.length ? this.viewEndGrid = this.gridId+Math.floor(this.canvasWidth)+Math.floor(this.canvasHeight/100)+96 : 0;
	}
	catch (e) {
		console.log(e);
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
	try {
		if (this.owner !== id) {
			this.owner = true;
			this.contesting = true;

			updatedGrids.push(this);

		setTimeout(() => {
			this.cracks = 1;
			updatedGrids.push(this);
		},this.delay*.33);

		setTimeout(() => {
			this.cracks = 2;
			updatedGrids.push(this);
		},this.delay*.66);

			setTimeout(() => {
				if (players[index]) {
					this.owner = id;
					this.rgb = players[index].rgb;
					this.occupied = true;
					this.delay = 200;
					this.contesting = false;
					grids[players[index].lastGridId].occupied = false;
					updatedGrids.push(grids[players[index].lastGridId]);
					updatedGrids.push(this);

					players[index].lastGridId = this.gridId;				
					players[index].gridId = this.gridId;
					players[index].x = this.x;
					players[index].y = this.y;
					players[index].contesting = false;

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
				updatedGrids.push(grids[players[index].lastGridId]);
				updatedGrids.push(this);
			
				players[index].lastGridId = this.gridId;				
				players[index].gridId = this.gridId;
				players[index].x = this.x;
				players[index].y = this.y;
				players[index].contesting = false;
			},200);
		}
	}
	catch (e) {
		console.log(e);
	}
}
Grid.prototype.reset = function() {
	try {
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
		updatedGrids.push(this);
	}
	catch (e) {
		console.log(e);
	}
}