
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
				grids[i].owner = false;
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
	// for (var i=0; i<updatedGrids.length;) {
	// 	if (updatedGrids[i].owner === false) {
	// 		updatedGrids[i].rgb = [];
	// 		updatedGrids.splice(i, 1);
	// 	}
	// 	else {
	// 		i++;
	// 	}
	// }
},30);





function Player() {
	this.x = 50;
	this.y = 50;
	this.id = Math.random();
	this.gridId = 102;
	this.lastGridId = 0;
	this.moves = [false, false, false, false];
	this.contesting = false;
	this.rgb = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];

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
	if (this.contesting===false) {
		if (this.moves[0] && this.y>0) {
			grids[this.gridId-1].own(index, this.id);
		}
		else if (this.moves[1] && this.x<4950) {
			grids[this.gridId+100].own(index, this.id);
		}
		else if (this.moves[2] && this.y<4950) {
			grids[this.gridId+1].own(index, this.id);
		}
		else if (this.moves[3] && this.x>0) {
			grids[this.gridId-100].own(index, this.id);
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
		// this.gridsInView = 
		// this.gridsInView.concat(
		// 	grids.slice(i+this.gridId-7, i+this.gridId+8)
		// );	
	}
	// console.log(this.viewStartGrid + " " + this.gridId);
};





function Grid(x, y) {
	this.owner = false;
	this.x = x;
	this.y = y;
	this.gridId = this.y/50 + (this.x/50 * 100);
	this.rgb;
	this.occupied = false;
}
Grid.prototype.own = function(index, id) {	
	players[index].contesting = true;

	if (this.owner !== id) {
		this.owner = true;
		// updatedGrids.push(this);

		setTimeout(() => {
			if (players[index]) {
				this.owner = id;
				this.rgb = players[index].rgb;
				this.occupied = true;


				grids[players[index].lastGridId].occupied = false;
				players[index].lastGridId = this.gridId;				

				players[index].gridId = this.gridId;
				players[index].x = this.x;
				players[index].y = this.y;
				players[index].contesting = false;
			}
		},100);
	}
	else if (this.owner === id) {
		setTimeout(() => {
			this.occupied = true;
			grids[players[index].lastGridId].occupied = false;
			players[index].lastGridId = this.gridId;				

			players[index].gridId = this.gridId;
			players[index].x = this.x;
			players[index].y = this.y;
			players[index].contesting = false;
		},100);
	}
}