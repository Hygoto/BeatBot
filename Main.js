import {Client} from "revolt.js";
import {Low, JSONFile} from 'lowdb';
import config from './config.json' assert {type:'json'};

let client = new Client();
const db = new Low(new JSONFile('./db.json'));

client.on("ready", async() =>
    console.info(`Logged in as ${client.user.username}!`),
);
client.on("message", messageRecieved);

async function messageRecieved(message) {
    const command = message.content.split(/ /);
    if (command[0] === config.keyword) {
        await db.read();
        const revoltid = message.author_id;
        let id;

        id = (db.data.users.find((user) => user.revolt === revoltid) ?? {scoresaber: -1}).scoresaber
        let response;
        if (id === -1) {
            if (command[1] === 'register') {
                response = await register(revoltid, command[2]);
                message.channel.sendMessage(response);
            }
            else {
                message.channel.sendMessage(
                    `You are not registered. \
                    You can register with ${config.keyword} register *scoresaberID*.`);
            }
        }
        else {
            try {
                switch (command[1]) {
                    case "recentsong":
                        response = await recentsong(id, command);
                        message.channel.sendMessage(response);
                    break;
        
                    case "topsong":
                        response = await topsong(id, command);
                        message.channel.sendMessage(response);
                    break;
        
                    case "recentsongs":
                        response = await recentsongs(id, command);
                        message.channel.sendMessage(response);
                    break;
        
                    case "topsongs":
                        response = await topsongs(id, command);
                        message.channel.sendMessage(response);
                    break;
        
                    case "register":
                        message.channel.sendMessage('You are already registered.')
                    break;

                    case "help":
                        message.channel.sendMessage(
                            `**commands**\n` +
                            `${config.keyword} recentsong\n` +
                            `${config.keyword} topsong\n` +
                            `${config.keyword} recentsongs\n` +
                            `${config.keyword} topsongs`);
                    break;
                }
            }
            catch (error) {
                message.channel.sendMessage('Something went wrong.');
            }
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
    if (score.playerScores[0].leaderboard.ranked) {
        return (
            `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
            `Rank: ${score.playerScores[0].score.rank}\n` +
            `Score: ${score.playerScores[0].score.baseScore}\n` +
            `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}\n` +
            `pp: ${score.playerScores[0].score.pp}`
        );
    }
    else {
        return (
            `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
            `Rank: ${score.playerScores[0].score.rank}\n` +
            `Score: ${score.playerScores[0].score.baseScore}\n` +
            `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}`
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
    return (
        `Song: [${score.playerScores[0].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
        `Rank: ${score.playerScores[0].score.rank}\n` +
        `Score: ${score.playerScores[0].score.baseScore}\n` +
        `Acc: ${(score.playerScores[0].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}\n` +
        `pp: ${score.playerScores[0].score.pp}`
    );
}

async function recentsongs(id, command) {
    let page;
    let response = '### recent scores';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=recent&page=${page}&withMetadata=false`);
    for (let index = 0; index < 8; index++) {
        const hash = score.playerScores[index].leaderboard.songHash;
        const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+hash);
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(hash, diff, map);
        if (score.playerScores[index].leaderboard.ranked) {
            response += `\n` +
                `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
                `Rank: ${score.playerScores[index].score.rank}\n` +
                `Score: ${score.playerScores[index].score.baseScore}\n` +
                `Acc: ${(score.playerScores[index].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}\n` +
                `pp: ${score.playerScores[index].score.pp}`;
        }
        else {
            response += `\n` +
                `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
                `Rank: ${score.playerScores[index].score.rank}\n` +
                `Score: ${score.playerScores[index].score.baseScore}\n` +
                `Acc: ${(score.playerScores[index].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}`;
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
    for (let index = 0; index < 8; index++) {
        const hash = score.playerScores[index].leaderboard.songHash;
        const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+hash);
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(hash, diff, map);
        response +=
            `\n` +
            `Song: [${score.playerScores[index].leaderboard.songName}](<https://beatsaver.com/maps/${map.id}>)  (${diff[1]})\n` +
            `Rank: ${score.playerScores[index].score.rank}\n` +
            `Score: ${score.playerScores[index].score.baseScore}\n` +
            `Acc: ${(score.playerScores[index].score.baseScore/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2)}\n` +
            `pp: ${score.playerScores[index].score.pp}`;
    }
    return response;
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

function getDiffPos(hash, diff, map) {
    let diffPos = [0, 0];
    diffPos[0] = map.versions.findIndex((value) => (value.hash !== hash.toLowerCase())) + 1;
    diffPos[1] = map.versions[diffPos[0]].diffs.findIndex(
        (value) => (value.difficulty !== diff[1] || `Solo${value.characteristic}` !== diff[2])
    ) + 1;
    return diffPos;
}

async function fetchJSONfrom(url) {
    const response = await fetch(url);
    return response.json();
}

client.loginBot(config.botToken);