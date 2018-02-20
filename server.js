
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const PORT = process.env.PORT || 3000;

//const app = express(); 
//app.use('/', express.static('./public'));

const INDEX = path.join(__dirname, 'index.html');
const server = express()
  .use("/", (req, res) => res.sendFile(INDEX) )
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
			grids[players[currentId].baseGrid-1].reset();
			grids[players[currentId].baseGrid+99].reset();
			grids[players[currentId].baseGrid+100].reset();
			grids[players[currentId].baseGrid+101].reset();
			grids[players[currentId].baseGrid+1].reset();
			grids[players[currentId].baseGrid-99].reset();
			grids[players[currentId].baseGrid-100].reset();
			grids[players[currentId].baseGrid-101].reset();

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
			var playerId = message.info.id ? message.info.id : message.id;

			//Get client's id
			var currentId;
			for (var i=0; i<players.length; i++) {
				if (players[i].id == playerId) {
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
		
			//Player sent message
			else if (message.type == 'build') {
				grids[message.info[0]].reset();
			}

			//Player sent message
			else if (message.type == 'chat') {
				grids[players[currentId].gridId].chat(message.info);
			}

			//Player just joined
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
		var x;
		var y;
		var gridId;
		getSpawnGrid();
		function getSpawnGrid() {
			var randGrid = Math.floor(Math.random()*9000)+500;
			if (grids[randGrid].owner === false && grids[randGrid].rock <= 980 && randGrid.toString().slice(-2) > 5 && randGrid.toString().slice(-2) < 95) {

				x = grids[randGrid].x;
				y = grids[randGrid].y;
				gridId = randGrid;
				grids[gridId-1].reset('980');
				grids[gridId+99].reset('990');
				grids[gridId+100].reset('980');
				grids[gridId+101].reset('990');
				grids[gridId+1].reset('980');
				grids[gridId-99].reset('990');
				grids[gridId-100].reset('980');
				grids[gridId-101].reset('990');
				grids[gridId].reset('981');
			}
			else {
				console.log('taken');
				getSpawnGrid();
			}
		}

		clients.push(ws);
		players.push(new Player(x, y, gridId));

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











function Player(x, y, gridId) {
	this.stuff = false;
	this.x = x;
	this.y = y;
	this.id = Math.random();
	this.gridId = gridId;
	this.baseGrid = gridId;
	this.lastGridId = gridId;
	this.moves = [false, false, false, false];
	this.rgb = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];
	this.contesting = false;
	this.smooth = [0, 0, 0, 0];
	this.stones = [0, 0, 0, 0];
	this.canvasWidth;
	this.canvasHeight;
	this.smoothMoving = false;
};
Player.prototype.update = function() {
	var index = players.indexOf(this);

	try {
		//WASD or arrows
		if (this.contesting === false) {
			if (this.moves[0] && grids[this.gridId-1].rock <= 981 && grids[this.gridId-1].occupied === false) {
				this.contesting = true;
				grids[this.gridId-1].own(index, this.id);
				this.smooth = ['up', grids[this.gridId-1].delay, grids[this.gridId-1].x, grids[this.gridId-1].y];
			}
			else if (this.moves[1] && grids[this.gridId+100].rock <= 981 && grids[this.gridId+100].occupied === false) {
				this.contesting = true;
				grids[this.gridId+100].own(index, this.id);
				this.smooth = ['right', grids[this.gridId+100].delay, grids[this.gridId+100].x, grids[this.gridId+100].y];
			}
			else if (this.moves[2] && grids[this.gridId+1].rock <= 981 && grids[this.gridId+1].occupied === false) {
				this.contesting = true;
				grids[this.gridId+1].own(index, this.id);
				this.smooth = ['down', grids[this.gridId+1].delay, grids[this.gridId+1].x, grids[this.gridId+1].y];
			}
			else if (this.moves[3] && grids[this.gridId-100].rock <= 981 && grids[this.gridId-100].occupied === false) {
				this.contesting = true;
				grids[this.gridId-100].own(index, this.id);
				this.smooth = ['left', grids[this.gridId-100].delay, grids[this.gridId-100].x, grids[this.gridId-100].y];
			}
			else if (this.moves[4] !== false) {
				var cost = this.moves[4] == 0 ? 10 : 
						   this.moves[4] == 1 ? 5 : 
						   this.moves[4] == 2 ? 3 : 
						   this.moves[4] == 3 ? 1 : null;

				if (this.stones[this.moves[4]]-cost >= 0 && grids[this.gridId].owner == this.id && grids[this.gridId].rock < 1000) {
					this.stones[this.moves[4]] -= cost;
					grids[this.gridId].build(this.moves[4]);
				}
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
	this.rock = Math.floor((Math.random()*1000)+1);
	this.image;
	this.message;
	this.delay;
	this.cracks = 0;
	this.contesting = false;
	this.building = false;

	if (this.x == 0 || this.y == 0 || this.x == 4950 || this.y == 4950) {
		this.rock = 1001;
	}

	this.rock <= 750 ? this.delay = 300 :
	this.rock <= 950 ? this.delay = 600 :
	this.rock <= 980 ? this.delay = 900 : 
	this.rock <= 981 ? this.delay = 2000 :
	this.rock <= 1000 ? this.delay = 0 : this.delay = 0;

	this.rock <= 750 ? this.image = 0 :
	this.rock <= 950 ? this.image = 1 :
	this.rock <= 980 ? this.image = 2 : 
	this.rock <= 981 ? this.image = 3 : 
	this.rock <= 1000 ? this.image = 4 : this.image = 4;
};
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
					if (this.rock <= 750) {
						players[index].stones[0]++;
					}
					else if (this.rock <= 950) {
						players[index].stones[1]++;
					}
					else if (this.rock <= 980) {
						players[index].stones[2]++;
					}
					else if (this.rock <= 981) {
						players[index].stones[3]++;
					}

					this.rock = 0;
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

					// clients[index].send(JSON.stringify({
					// 	type: 'claimGrid',
					// 	rock: this
					// }));				
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
};
Grid.prototype.build = function(rock) {
	this.rock = rock == 0 ? 1000 : rock  == 1 ? 1001 : rock == 2 ? 1002 : rock == 3 ? 1003 : 0;

	this.rock == 1000 ? this.image = 5 :
	this.rock == 1001 ? this.image = 6 :
	this.rock == 1002 ? this.image = 7 : 
	this.rock == 1003 ? this.image = 8 : 0;


	this.occupied = false;
	console.log(this.rock + ' ' + this.image);
	updatedGrids.push(this);
};
Grid.prototype.reset = function(rock) {
	try {
		this.owner = false;
		this.gridId = this.y/50 + (this.x/50 * 100);
		this.rgb;
		this.occupied = false;
		this.rock = rock ? rock : Math.floor((Math.random()*1000)+1);
		this.delay;
		this.cracks = 0;
		this.contesting = false;

		this.rock <= 750 ? this.delay = 300 :
		this.rock <= 950 ? this.delay = 600 :
		this.rock <= 980 ? this.delay = 900 : 
		this.rock <= 981 ? this.delay = 2000 :
		this.rock <= 1000 ? this.delay = 0 : this.delay = 0;

		this.rock <= 750 ? this.image = 0 :
		this.rock <= 950 ? this.image = 1 :
		this.rock <= 980 ? this.image = 2 : 
		this.rock <= 981 ? this.image = 3 : 
		this.rock <= 1000 ? this.image = 4 : this.image = 4;
		updatedGrids.push(this);
	}
	catch (e) {
		console.log(e);
	}
};
Grid.prototype.chat = function(message) {
	try {
		this.message = message.length > 25 ? this.message = message.slice(0, 25) : message;

		updatedGrids.push(this);
		setTimeout(() => {
			this.message = '';
			updatedGrids.push(this);
		}, 5000);
	}
	catch (e) {
		console.log(e);
	}
};