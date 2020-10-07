const { open, readSync, close, writeSync } = require("fs");
const path = require("path");
const prompt = require('prompt-sync')({sigint: true});

let homeDir = process.env.USERPROFILE;
let amongUsDir = path.join(homeDir, 'AppData', 'LocalLow', 'Innersloth', 'Among Us');
let statsFile = path.join(amongUsDir, 'playerStats2');

let types = {
	int8: {
		size: 1,
		type: "int8"
	},
	int32: {
		size: 4,
		type: "int32"
	},
	int64: {
		size: 8,
		type: "int64"
	},
	float: {
		size: 4,
		type: "float"
	},
}

let statTypes = {
	"##Verbosity": types.int8,
	"Bodies Reported": types.int32,
	"Emergencies Called": types.int32,
	"Tasks Completed": types.int32,
	"Completed All Tasks": types.int32,
	"Sabotages Fixed": types.int32,
	"Impostor Kills": types.int32,
	"Times Murdered": types.int32,
	"Times Ejected": types.int32,
	"Crewmate Streak": types.int32,
	"Times Impstor": types.int32,
	"Times Crewmate": types.int32,
	"Games Started": types.int32,
	"Games Finished": types.int32,
	"Crewmate Vote Wins": types.int32,
	"Crewmate Task Wins": types.int32,
	"Impostor Vote Wins": types.int32,
	"Impostor Kill Wins": types.int32,
	"Impostor Sabotage Wins": types.int32,
	"##WinArrayBuffer": {
		size: 2*types.int32.size,
		type: "padding"
	},
	"##LoseArrayBuffer": {
		size: 7*types.int32.size,
		type: "padding"
	},
	"##DrawArrayBuffer": {
		size: 7*types.int32.size,
		type: "padding"
	},
	"Ban Points": types.float,
	"##lastGame": types.int64
};

// Generate Offsets
let offset = 0;
let offsets = {};

for(let statName in statTypes) {
	offsets[statName] = offset;
	offset += statTypes[statName].size;
}

let options = Object.keys(statTypes).filter(v => !v.startsWith('##'));

let _fd;

function exit() {
	close(_fd, () => process.exit());
}

process.on('SIGINT', () => {
	exit();
});

open(statsFile, 'r+', (err, fd) => {
	_fd = fd;
	if(err) {
		console.error(err);
		return;
	}

	while(1) {
		for(let statInd in options) {
			let statName = options[statInd];
			let stat = statTypes[statName];
			let buff = Buffer.alloc(stat.size);
			readSync(fd, buff, 0, stat.size, offsets[statName]);
			let value;
			switch(stat.type) {
				case 'int32': 
					value = buff.readInt32LE();
					break;
				case 'float':
					value = buff.readFloatLE();
					break;
			}
			console.log(`[${statInd}] ${statName}: ${value}`);
		}

		let num = NaN;
		while(isNaN(num) || num < 0 || num >= options.length) {
			let input = prompt("Enter stat to modify (q to quit): ");

			if(input.toLowerCase() == 'q') {
				exit(fd);
				return;
			}

			if(input == "") {
				continue;
			}
			
			num = Number(input);
		}
		
		let valueNum = NaN;
		while(isNaN(valueNum)) {
			let input = prompt(`Enter a value for ${options[num]}: `);
			if(input == "") {
				continue;
			}
			valueNum = Number(input);
		}

		console.log(num, valueNum);
		
		let chosenStatName = options[num];
		let chosenStat = statTypes[chosenStatName];
		let valueBuffer = Buffer.alloc(chosenStat.size);

		switch(chosenStat.type) {
			case 'int32': 
				valueBuffer.writeInt32LE(valueNum);
				break;
			case 'float':
				valueBuffer.writeFloatLE(valueNum);
				break;
		}

		writeSync(fd, valueBuffer, 0, chosenStat.size, offsets[chosenStatName]);
	}
});