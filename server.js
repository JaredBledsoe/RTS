
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
				players[currentId].chat(message.info);
			}

		}
		catch (e) {
			console.log(e);
		}
	});
	function getSpawnGrid() {
		var successful = true;
		var randGrid = Math.floor(Math.random()*9000)+500;

		for (var i=0; i<players.length;) {
			if (Math.abs(grids[players[i].baseGrid].x-grids[randGrid].x) >= 200 && Math.abs(grids[players[i].baseGrid].y-grids[randGrid].y) >= 4) {
				i++;
			}
			else {
				console.log(randGrid + ' ' + players[i].baseGrid);
				i = 0;
				randGrid = Math.floor(Math.random()*9000)+500;
				successful = false;
			}
		}

		if (grids[randGrid].owner === false && grids[randGrid].rock <= 980 && randGrid.toString().slice(-2) > 5 && randGrid.toString().slice(-2) < 95 && successful === true) {

			grids[randGrid-1].reset('980');
			grids[randGrid+99].reset('1002');
			grids[randGrid+100].reset('980');
			grids[randGrid+101].reset('1002');
			grids[randGrid+1].reset('980');
			grids[randGrid-99].reset('1002');
			grids[randGrid-100].reset('980');
			grids[randGrid-101].reset('1002');
			grids[randGrid].reset('990');

			clients.push(ws);

			players.push(new Player(grids[randGrid].x, grids[randGrid].y, randGrid));

			//Send to new player
			ws.send(JSON.stringify({
				type: 'initPlayer',
				player: players[players.length-1],
				grids: grids
			}));
			console.log(' ');
			console.log(' ');
			console.log(' ');
			console.log(' ');
		}
		else {
			console.log('did not work');
			getSpawnGrid();
		}
	}
	getSpawnGrid();
});










//Send grids to players
setInterval(function() {
	try {
		var minimizedPlayers = [];
		for (var i=0; i<players.length; i++) {
			minimizedPlayers.push([players[i].x, players[i].y, players[i].message]);
		}
		for (var i=0; i<players.length; i++) {
			players[i].update();
			
			clients[i].send(JSON.stringify({
				type: 'gameUpdate',
				player: players[i],
				updatedGrids: updatedGrids,
				players: minimizedPlayers
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
	this.health = 40;
	this.x = x;
	this.y = y;
	this.id = Math.random();
	this.gridId = gridId;
	this.baseGrid = gridId;
	this.lastGridId = gridId;
	this.moves = [false, false, false, false];
	this.rgb = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];
	this.contesting = false;
	this.smooth = null;
	this.stones = [0, 0, 0, 0];
	this.smoothMoving = false;
	this.message;
};
Player.prototype.update = function() {
	var index = players.indexOf(this);

	try {
		//WASD or arrows
		if (this.contesting === false) {
			if (this.moves[0] && grids[this.gridId-1].rock <= 990 && grids[this.gridId-1].occupied === false) {
				this.contesting = true;
				grids[this.gridId-1].own(index, this.id);
				this.smooth = -1;
			}
			else if (this.moves[1] && grids[this.gridId+100].rock <= 990 && grids[this.gridId+100].occupied === false) {
				this.contesting = true;
				grids[this.gridId+100].own(index, this.id);
				this.smooth = 100;
			}
			else if (this.moves[2] && grids[this.gridId+1].rock <= 990 && grids[this.gridId+1].occupied === false) {
				this.contesting = true;
				grids[this.gridId+1].own(index, this.id);
				this.smooth = 1;
			}
			else if (this.moves[3] && grids[this.gridId-100].rock <= 990 && grids[this.gridId-100].occupied === false) {
				this.contesting = true;
				grids[this.gridId-100].own(index, this.id);
				this.smooth = -100;
			}
			//Building
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
			//Attacking structure
			else if (this.moves[0] && grids[this.gridId-1].rock >= 1000) {
				grids[this.gridId-1].playerAttack(index);
			}
			else if (this.moves[1] && grids[this.gridId+100].rock >= 1000) {
				grids[this.gridId+100].playerAttack(index);
			}
			else if (this.moves[2] && grids[this.gridId+1].rock >= 1000) {
				grids[this.gridId+1].playerAttack(index);
			}
			else if (this.moves[3] && grids[this.gridId-100].rock >= 1000) {
				grids[this.gridId-100].playerAttack(index);
			}
		}

		//Move camera smoothly
	    if (typeof this.smooth === 'number' && this.smoothMoving === false) {
	    	var oldGridId = this.gridId;
	    	this.smoothMoving = true;


			var interval = grids[oldGridId+this.smooth].rock > 980 && grids[oldGridId+this.smooth].rock <= 990 ? 42 : grids[oldGridId+this.smooth].delay/25;

			var dist = grids[oldGridId+this.smooth].rock > 980 && grids[oldGridId+this.smooth].rock <= 990 ? 1 : 2; 

	    	var smoothCamera = setInterval(() => {
				if (this.smooth === -1) {
		          this.y-=dist;
		        }
		        else if (this.smooth === 100) {
		          this.x+=dist;
		        }
		        else if (this.smooth === 1) {
		          this.y+=dist;
		        }
		        else if (this.smooth === -100) {
		          this.x-=dist;
		        }

		        if (Math.abs(grids[oldGridId+this.smooth].x-this.x) <= 4 && Math.abs(grids[oldGridId+this.smooth].y-this.y) <= 4) {
		        	this.smoothMoving = false;
		        	this.smooth = null;
		        	clearInterval(smoothCamera);

		        }
		        else if (Math.abs(grids[oldGridId+this.smooth].x-this.x) >= 55 || Math.abs(grids[oldGridId+this.smooth].y-this.y) >= 55) {
		        	this.smoothMoving = false;
		        	this.smooth = null;
		        	clearInterval(smoothCamera);
		        }
	        	// console.log(Math.abs(grids[oldGridId+this.smooth].x-this.x) + ' ' + Math.abs(grids[oldGridId+this.smooth].y-this.y));
	    	}, interval);
		}
	}
	catch (e) {
		console.log(e);
	}
};
Player.prototype.chat = function(message) {
	try {
		if (!this.message) {
			this.message = message.length > 45 ? this.message = message.slice(0, 45) : message;

			var hide = setTimeout(() => {
				this.message = '';
			}, 4000);
		}
	}
	catch (e) {m
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
		if (this.owner !== id) {
			this.owner = true;
			this.contesting = true;

			updatedGrids.push(this);

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
					else if (this.rock <= 990) {
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
				}
			},this.delay);
		}
		else if (this.owner === id) {
			setTimeout(() => {
				this.health = players[index].health;
				this.occupied = true;
				this.cracks = 0;
				grids[players[index].lastGridId].occupied = false;
				updatedGrids.push(grids[players[index].lastGridId]);
				updatedGrids.push(this);
			
				players[index].lastGridId = this.gridId;				
				players[index].gridId = this.gridId;
				players[index].x = this.x;
				players[index].y = this.y;
				players[index].contesting = false
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

	this.health = 40;

	this.occupied = false;
	updatedGrids.push(this);
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
							
		players[index].stones[this.image-5] += stoneReceived;
		this.reset();
	}
	updatedGrids.push(this);
};
Grid.prototype.heal = function(damage) {
	setTimeout(() => {
		var healing = setInterval(() => {
			if (Math.trunc(this.health) < 40) {
				this.health += damage;
			}
			else if (Math.trunc(this.health) == 40) {
				this.health = 40;
				clearInterval(healing);
			}
			updatedGrids.push(this);
		},1000);
	},2100);
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
		this.rock <= 990 ? this.delay = 2100 :
		this.rock <= 1000 ? this.delay = 0 : this.delay = 0;

		this.rock <= 750 ? this.image = 0 :
		this.rock <= 950 ? this.image = 1 :
		this.rock <= 980 ? this.image = 2 : 
		this.rock <= 990 ? this.image = 3 : 
		this.rock <= 1000 ? this.image = 4 : 
		this.rock == 1000 ? this.image = 5 :
		this.rock == 1001 ? this.image = 6 :
		this.rock == 1002 ? this.image = 7 : 
		this.rock == 1003 ? this.image = 8 : 0;

		this.health = 40;

		updatedGrids.push(this);
	}
	catch (e) {
		console.log(e);
	}
};


