
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

	function close() {
		var currentId = clients.indexOf(ws);
		for (var i=0; i<updatedGrids.length;) {
			if (updatedGrids[i].owner === players[currentId].id) {
				updatedGrids[i].owner = false;
				updatedGrids.splice(i, 1);
			}
			else {
				i++;
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
        if (clients[i].readyState != clients[0].OPEN){
        	console.log("asdkasdjklasdjklsadljksadljkaslkd");
        }
        else {
			players[i].update();
			clients[i].send(JSON.stringify({
				type: 'gameUpdate',
				player: players[i],
				grids: updatedGrids
			}));
		}
		// if (i >= players.length-1) {
		// 	updatedGrids = [];
		// }
	}
},30);





function Player() {
	this.x = 50;
	this.y = 50;
	this.id = Math.random();
	this.gridId = 102;
	this.moves = [false, false, false, false];
	this.contesting = false;
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
	if (this.moves[0] && this.contesting===false && (this.gridId-1)%100!=0) {
		grids[this.gridId-1].own(index, this.id);
	}
	else if (this.moves[1] && this.contesting===false && (this.gridId+100)<9900) {
		grids[this.gridId+100].own(index, this.id);
	}
	else if (this.moves[2] && this.contesting===false && (this.gridId+1)%99!=0) {
		grids[this.gridId+1].own(index, this.id);
	}
	else if (this.moves[3] && this.contesting===false && (this.gridId-100)>99) {
		grids[this.gridId-100].own(index, this.id);
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
Grid.prototype.own = function(index, id) {	
	this.owner = true;
	players[index].contesting = true;
	updatedGrids.push(this);


	setTimeout(() => {
		players[index].contesting = false;

		this.owner = id;
		players[index].gridId = this.gridId;
		players[index].x = this.x;
		players[index].y = this.y;
	},100);
}


















