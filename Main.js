import {Client} from "revolt.js";
import {Low, JSONFile} from "lowdb";
import config from "./config.json" assert {type:"json"};
import axios from "axios";
import ScoreData from "./ScoreData.js";

let client = new Client();
const db = new Low(new JSONFile('./db.json'));
await db.read();
if (db.data === -1) {
    db.data = {"users": []};
    await db.write();
}

client.on("ready", async() =>
    console.info(`Logged in as ${client.user.username}!`),
);
client.on("message", messageRecieved);
if (config.status) setStatus(`${config.keyword} help`, 'Online');

async function messageRecieved(message) {
    let command;
    if (message.content === null) {
        command = config.keyword+'a';
    }
    else {
        command = message.content.split(/ /);
    }
    if (command[0] === config.keyword) {
        await db.read();
        const revoltid = message.author_id;
        let id;

        id = (db.data.users.find((user) => user.revolt === revoltid) ?? {scoresaber: -1}).scoresaber;
        let response;
        let registered = true;
        if (command.length > 3) {
            if (command[3].charAt(0) === '<') {
                const mentionedid = command[3].substr(2, 26);
                id = (db.data.users.find((user) => user.revolt === mentionedid) ?? {scoresaber: -1}).scoresaber;
                if (id === -1) {
                    registered = false;
                    response = 'This user is not registered.';
                }
            }  
        }
        else {
            if (id === -1) {
                registered = false;
                response = `You are not registered. \
                You can register with ${config.keyword} register *scoresaberID*.`;
            }
        }
        try {
            switch (command[1]) {
                case "recentsong":
                    if (registered) await song(id, command, 'recent', message.channel);
                    else message.channel.sendMessage(response);
                break;
    
                case "topsong":
                    if (registered) await song(id, command, 'top', message.channel);
                    else message.channel.sendMessage(response);
                break;
    
                case "recentsongs":
                    if (registered) await songs(id, command, 'recent', message.channel);
                    else message.channel.sendMessage(response);
                break;
    
                case "topsongs":
                    if (registered) await songs(id, command, 'top', message.channel);
                    else message.channel.sendMessage(response);
                break;

                case "profile":
                    if (registered) response = await profile(id);
                    message.channel.sendMessage(response);
                break;
    
                case "register":
                    if (registered) response = 'You are already registered.';
                    else response = await register(revoltid, command[2]);
                    message.channel.sendMessage(response);
                break;

                case "unregister":
                    if (registered) response = await unregister(revoltid);
                    message.channel.sendMessage(response);
                break;

                case "help":
                    message.channel.sendMessage(
                        `**commands**\n` +
                        `${config.keyword} recentsong\n` +
                        `${config.keyword} topsong\n` +
                        `${config.keyword} recentsongs\n` +
                        `${config.keyword} topsongs\n` +
                        `${config.keyword} profile\n` +
                        `${config.keyword} register *Scoresaber ID*\n` +
                        `${config.keyword} unregister`);
                break;

                case "id":
                    message.channel.sendMessage(id);
                break;

                default:
                    message.channel.sendMessage(
                        `Invalid command. \
                        You can use *${config.keyword} help* to get a list of commands.`);
                break;
            }
        }
        catch (error) {
            message.channel.sendMessage('Something went wrong.');
        }
    }
}

async function song(id, command, type, channel) {
    let page;
    let sort;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    if (type === 'recent') {sort = 'date';}
    else {sort = 'pp';}
    const scoresaber = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=${type}&page=${page}&withMetadata=false`);
    const beatleader = await fetchJSONfrom(`https://api.beatleader.xyz/player/${id}/scores?sortBy=${sort}&order=desc&page=${page}&count=1`);
    if (scoresaber.playerScores.length === 1 && beatleader.data.length === 1) {
        const selection = await select(channel);
        if (selection[0] === 'scoresaber') {
            const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+scoresaber.playerScores[0].leaderboard.songHash);
            const data = new ScoreData(scoresaber.playerScores[0], map);
            selection[1].edit({
            embeds: [{
                colour: '#fedf15',
                title: `${type} ScoreSaber score`,
                description: data.response()
            }]
        });
        }
        else {
            const data = new ScoreData(beatleader.data[0]);
            selection[1].edit({
                embeds: [{
                    colour: '#f80092',
                    title: `${type} BeatLeader score`,
                    description: data.response()
                }]
            });
        }
    }
    else if (scoresaber.playerScores.length === 1) {
        const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+scoresaber.playerScores[0].leaderboard.songHash);
        const data = new ScoreData(scoresaber.playerScores[0], map);
        channel.sendMessage({
            embeds: [{
                colour: '#fedf15',
                title: `${type} ScoreSaber score`,
                description: data.response()
            }]
        });
    }
    else {
        const data = new ScoreData(beatleader.data[0], undefined);
        channel.sendMessage({
            embeds: [{
                colour: '#f80092',
                title: `${type} BeatLeader score`,
                description: data.response()
            }]
        });
    }
}

async function songs(id, command, type, channel) {
    let page;
    let sort;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    if (type === 'recent') {sort = 'date';}
    else {sort = 'pp';}
    const scoresaber = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=${type}&page=${page}&withMetadata=false`);
    const beatleader = await fetchJSONfrom(`https://api.beatleader.xyz/player/${id}/scores?sortBy=${sort}&order=desc&page=${page}&count=8`);
    if (scoresaber.playerScores.length > 0 && beatleader.data.length > 0) {
        const selection = await select(channel);
        if (selection[0] === 'scoresaber') {
            let hash = Array(8);
            for (let index = 0; index < 8; index++) {
                if (index < scoresaber.playerScores.length) {
                    hash[index] = scoresaber.playerScores[index].leaderboard.songHash.toLowerCase();
                }
                else {
                    hash[index] = scoresaber.playerScores[0].leaderboard.songHash.toLowerCase()
                }
            }
            const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
            let data = Array(scoresaber.playerScores.length);
            let response = '';
            for (let index = 0; index < data.length; index++) {
                data[index] = new ScoreData(scoresaber.playerScores[index], map[hash[index]]); 
                response += '\n' + data[index].response();
            }
            response = response.substr(1);
            selection[1].edit({
                embeds: [{
                    colour: '#fedf15',
                    title: `${type} ScoreSaber scores`,
                    description: response
                }]
            });
        }
        else {
            let data = Array(beatleader.data.length);
            let response = '';
            for (let index = 0; index < data.length; index++) {
                data[index] = new ScoreData(beatleader.data[index], undefined); 
                response += '\n' + data[index].response();
            }
            response = response.substr(1);
            selection[1].edit({
                embeds: [{
                    colour: '#f80092',
                    title: `${type} BeatLeader scores`,
                    description: response
                }]
            });
        }
    }
    else if (scoresaber.playerScores.length > 0) {
        let hash = Array(8);
        for (let index = 0; index < 8; index++) {
            if (index < scoresaber.playerScores.length) {
                hash[index] = scoresaber.playerScores[index].leaderboard.songHash.toLowerCase();
            }
            else {
                hash[index] = scoresaber.playerScores[0].leaderboard.songHash.toLowerCase()
            }
        }
        const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
        let data = Array(scoresaber.playerScores.length);
        let response = '';
        for (let index = 0; index < data.length; index++) {
            data[index] = new ScoreData(scoresaber.playerScores[index], map[hash[index]]); 
            response += '\n' + data[index].response();
        }
        response = response.substr(1);
        channel.sendMessage({
            embeds: [{
                colour: '#fedf15',
                title: `${type} ScoreSaber scores`,
                description: response
            }]
        });
    }
    else if (beatleader.data.length > 0) {
        let data = Array(beatleader.data.length);
        let response = '';
        for (let index = 0; index < data.length; index++) {
            data[index] = new ScoreData(beatleader.data[index], undefined); 
            response += '\n' + data[index].response();
        }
        response = response.substr(1);
        channel.sendMessage({
            embeds: [{
                colour: '#f80092',
                title: `${type} BeatLeader scores`,
                description: response
            }]
        });
    }
}

async function profile(id) {
    const scoresaber = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/full`);
    const beatleader = await fetchJSONfrom(`https://api.beatleader.xyz/player/${id}?stats=true`);
    let response = '';
    if (scoresaber.id === id) {
        response += (
            `### [ScoreSaber](<https://scoresaber.com/u/${id}>)\n` +
            `pp: ${scoresaber.pp}\n` +
            `Rank: ${scoresaber.rank} Global, ${scoresaber.countryRank} in ${scoresaber.country}\n` +
            `Average Ranked Acc: ${scoresaber.scoreStats.averageRankedAccuracy.toFixed(2)}%\n` +
            `Play Count: ${scoresaber.scoreStats.totalPlayCount} total, ${scoresaber.scoreStats.rankedPlayCount} ranked\n` +
            `Replays watched by others: ${scoresaber.scoreStats.replaysWatched}`
        );
        if (beatleader.id === id) response += '\n';
    }
    if (beatleader.id === id) {
        response += (
            `### [BeatLeader](<https://beatleader.xyz/u/${id}>)\n` +
            `pp: ${beatleader.pp}\n` +
            `Rank: ${beatleader.rank} Global, ${beatleader.countryRank} in ${beatleader.country}\n` +
            `Average Ranked Acc: ${(beatleader.scoreStats.averageRankedAccuracy*100).toFixed(2)}%\n` +
            `Play Count: ${beatleader.scoreStats.totalPlayCount} total, ${beatleader.scoreStats.rankedPlayCount} ranked\n` +
            `Replays watched by others: ${beatleader.scoreStats.replaysWatched}`
        );
    }
    return response;
}

async function register(revoltid, id) {
    try {
        db.read();
        const scoresaber = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/basic`);
        let valid = false;
        let name;
        if (scoresaber.id === id) {
            valid = true;
            name = scoresaber.name;
        }
        else {
            const beatleader = await fetchJSONfrom(`https://api.beatleader.xyz/player/${id}?stats=false`);
            if (beatleader.id === id) {
                valid = true;
                name = beatleader.name;
            }
        }
        if (valid) {
            db.data.users.push({revolt: revoltid, scoresaber: id});
            db.write();
            return `You are now registered as ${name}`; 
        }
        else return 'Invalid profile';
    }
    catch (error) {
        return 'Invalid profile';
    }
}

async function unregister(revoltid) {
    await db.read();
    const index = db.data.users.findIndex((value) => (value.revolt === revoltid));
    db.data.users.splice(index, 1);
    db.write();
    return 'Your profile has been deleted.';
}

async function fetchJSONfrom(url) {
    const response = await fetch(url);
    return response.json();
}

async function setStatus(text, presence) {
    await axios.patch(
        `${client.apiURL}/users/@me`,
        {
            status: { text, presence }
        },
        {
            headers: {
                'x-bot-token': config.botToken
            }
        }
    );
}

const select = (channel) => new Promise(async (resolve) => {
    const scoresaber = '01GEF2RDY1ZP8A2YN1VZHDQ9WZ';
    const beatleader = '01GEF2DD1NY3KMH99QQA3KW9XB';
    let msg = await channel.sendMessage({
        embeds: [{
            colour: '#1f1e33',
            title: 'select source',
            description: `select whether you want data from ScoreSaber :${scoresaber}: or Beatleader :${beatleader}:`
        }],
        interactions: {
            reactions: [scoresaber, beatleader],
            restrict_reactions: true
        }
    })
    let active = true;
    const cb = async(packet) => {
        if (packet.type != 'MessageReact') {return;};
        if (packet.id != msg._id) return;
        
        switch (packet.emoji_id) {
            case scoresaber:
                channel.client.removeListener('packet', cb);
                active = false;
                resolve(['scoresaber', msg]);
            break;

            case beatleader:
                channel.client.removeListener('packet', cb);
                active = false;
                resolve(['beatleader', msg]);
            break;
        }
    }
    channel.client.on('packet', cb);

    setTimeout(() => {
        if (active) {
            channel.client.removeListener('packet', cb);
            resolve([config.standardSource, msg]);
        }
    }, 60000);
});

client.loginBot(config.botToken);