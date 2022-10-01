import {Client} from "revolt.js";
import {Low, JSONFile} from 'lowdb';
import config from './config.json' assert {type:'json'};
import axios from "axios";

let client = new Client();
const db = new Low(new JSONFile('./db.json'));
await db.read();
if (db.data === -1) {
    db.data = {"users": []}
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
                    if (registered) response = await recentsong(id, command);
                    message.channel.sendMessage(response);
                break;
    
                case "topsong":
                    if (registered) response = await topsong(id, command);
                    message.channel.sendMessage(response);
                break;
    
                case "recentsongs":
                    if (registered) response = await recentsongs(id, command);
                    message.channel.sendMessage(response);
                break;
    
                case "topsongs":
                    if (registered) response = await topsongs(id, command);
                    message.channel.sendMessage(response);
                break;

                case "profile":
                    if (registered) response = await profile(id);
                    message.channel.sendMessage(response);
                break;
    
                case "register":
                    if (registered) response = 'You are already registered.';
                    else response = await register(revoltid, command[2]);
                    message.channel.sendMessage(response)
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

async function recentsong(id, command) {
    let page;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=recent&page=${page}&withMetadata=false`);
    const hash = score.playerScores[0].leaderboard.songHash;
    const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+hash);
    const diff = score.playerScores[0].leaderboard.difficulty.difficultyRaw.split(/_/);
    const diffPos = getDiffPos(hash, diff, map);
    const diffColor = getDiffColor(map.versions[diffPos[0]].diffs[diffPos[1]].difficulty);
    const isoTime = new Date(score.playerScores[0].score.timeSet);
    if (score.playerScores[0].leaderboard.ranked) {
        return (
            `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
            `Rank: ${score.playerScores[0].score.rank}\n` +
            `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
            `Score: ${score.playerScores[0].score.baseScore}\n` +
            `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%\n` +
            `Star Rating: ${score.playerScores[0].leaderboard.stars}★\n` +
            `pp: ${score.playerScores[0].score.pp}`
        );
    }
    else {
        return (
            `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
            `Rank: ${score.playerScores[0].score.rank}\n` +
            `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
            `Score: ${score.playerScores[0].score.baseScore}\n` +
            `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%`
        );
    }
}

async function topsong(id, command) {
    let page;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=top&page=${page}&withMetadata=false`);
    const hash = score.playerScores[0].leaderboard.songHash;
    const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+hash);
    const diff = score.playerScores[0].leaderboard.difficulty.difficultyRaw.split(/_/);
    const diffPos =  getDiffPos(hash, diff, map);
    const diffColor = getDiffColor(map.versions[diffPos[0]].diffs[diffPos[1]].difficulty);
    const isoTime = new Date(score.playerScores[0].score.timeSet);
    return (
        `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
        `Rank: ${score.playerScores[0].score.rank}\n` +
        `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
        `Score: ${score.playerScores[0].score.baseScore}\n` +
        `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%\n` +
        `Star Rating: ${score.playerScores[0].leaderboard.stars}★\n` +
        `pp: ${score.playerScores[0].score.pp}`
    );
}

async function recentsongs(id, command) {
    let page;
    let response = '### recent scores';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=recent&page=${page}&withMetadata=false`);
    let hash = Array(score.playerScores[0].leaderboard.songHash, score.playerScores[1].leaderboard.songHash, score.playerScores[2].leaderboard.songHash, score.playerScores[3].leaderboard.songHash, score.playerScores[4].leaderboard.songHash, score.playerScores[5].leaderboard.songHash, score.playerScores[6].leaderboard.songHash, score.playerScores[7].leaderboard.songHash);
    hash.forEach((element, index) => {hash[index] = element.toLowerCase()});
    const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
    for (let index = 0; index < 8; index++) {
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(hash[index], diff, map[hash[index]]);
        const diffColor = getDiffColor(map[hash[index]].versions[diffPos[0]].diffs[diffPos[1]].difficulty);
        const isoTime = new Date(score.playerScores[index].score.timeSet);
        if (score.playerScores[index].leaderboard.ranked) {
            response += `\n` +
                `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map[hash[index]].id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
                `Rank: ${score.playerScores[index].score.rank}\n` +
                `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
                `Score: ${score.playerScores[index].score.baseScore}\n` +
                `Acc: ${(score.playerScores[index].score.baseScore/map[hash[index]].versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%\n` +
                `Star Rating: ${score.playerScores[index].leaderboard.stars}★\n` +
                `pp: ${score.playerScores[index].score.pp}`;
        }
        else {
            response += `\n` +
                `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map[hash[index]].id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
                `Rank: ${score.playerScores[index].score.rank}\n` +
                `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
                `Score: ${score.playerScores[index].score.baseScore}\n` +
                `Acc: ${(score.playerScores[index].score.baseScore/map[hash[index]].versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%`;
        }
    }
    return response;
}

async function topsongs(id, command) {
    let page;
    let response = '### top scores';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=top&page=${page}&withMetadata=false`);
    let hash = Array(score.playerScores[0].leaderboard.songHash, score.playerScores[1].leaderboard.songHash, score.playerScores[2].leaderboard.songHash, score.playerScores[3].leaderboard.songHash, score.playerScores[4].leaderboard.songHash, score.playerScores[5].leaderboard.songHash, score.playerScores[6].leaderboard.songHash, score.playerScores[7].leaderboard.songHash);
    hash.forEach((element, index) => {hash[index] = element.toLowerCase()});
    const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
    for (let index = 0; index < 8; index++) {
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(hash[index], diff, map[hash[index]]);
        const diffColor = getDiffColor(map[hash[index]].versions[diffPos[0]].diffs[diffPos[1]].difficulty);
        const isoTime = new Date(score.playerScores[index].score.timeSet);
        response +=
            `\n` +
            `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map[hash[index]].id}>)  $\\color{${diffColor}}\\textsf{${diff[1]}}$\n` +
            `Rank: ${score.playerScores[index].score.rank}\n` +
            `Time set: <t:${isoTime.getTime()/1000}:R>\n`+
            `Score: ${score.playerScores[index].score.baseScore}\n` +
            `Acc: ${(score.playerScores[index].score.baseScore/map[hash[index]].versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}%\n` +
            `Star Rating: ${score.playerScores[index].leaderboard.stars}★\n` +
            `pp: ${score.playerScores[index].score.pp}`;
    }
    return response;
}

async function profile(id) {
    const profile = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/full`);
    return (
        `### ${profile.name}\n` +
        `pp: ${profile.pp}\n` +
        `Rank: ${profile.rank} Global, ${profile.countryRank} in ${profile.country}\n` +
        `Average Ranked Acc: ${profile.scoreStats.averageRankedAccuracy.toFixed(2)}%\n` +
        `Play Count: ${profile.scoreStats.totalPlayCount} total, ${profile.scoreStats.rankedPlayCount} ranked\n` +
        `Replays watched by others: ${profile.scoreStats.replaysWatched}`
    );
}

async function register(revoltid, id) {
    try {
        db.read();
        const player = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/basic`);
        if (player.id === id) {
            db.data.users.push({revolt: revoltid, scoresaber: id});
            db.write();
            return `You are now registered as ${player.name}`; 
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

function getDiffPos(hash, diff, map) {
    let diffPos = [0, 0];
    diffPos[0] = map.versions.findIndex((value) => (value.hash === hash.toLowerCase()));
    diffPos[1] = map.versions[diffPos[0]].diffs.findIndex(
        (value) => (value.difficulty === diff[1] && `Solo${value.characteristic}` === diff[2])
    );
    return diffPos;
}

function getDiffColor(diff) {
    switch (diff) {
        case 'Easy':
            return '#3cb371';
    
        case 'Normal':
            return '#59b0f4';

        case 'Hard':
            return '#ff6347';

        case 'Expert':
            return '#bf2a42';

        case 'ExpertPlus':
            return '#8f48db';
    }
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

client.loginBot(config.botToken);