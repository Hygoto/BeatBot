import {Client} from "revolt.js";
import {Low, JSONFile} from 'lowdb';
import config from './config.json' assert {type:'json'};

let client = new Client();
const db = new Low(new JSONFile('./db.json'));

client.on("ready", async() =>
    console.info(`Logged in as ${client.user.username}!`),
);

client.on("message", async (message) => {
    const command = message.content.split(/ /);
    if (command[0] === config.keyword) {
        const revoltid = message.author_id;
        let id;
        db.read();
        try {
            for (let index = 0; index < db.data.users.length+1; index++) {
                if (revoltid == db.data.users[index].revolt) {
                    id = db.data.users[index].scoresaber;
                    break;
                }
            }
        } catch (error) {
            id = -1;
        }
        let response;
        if (id == -1) {
            if (command[1] === 'register') {
                response = await register(revoltid, command[2]);
                message.channel.sendMessage(response);
            }
            else message.channel.sendMessage(`You are not registered. You can register with ${config.keyword} register *scoresaberID*.`)
        }
        else {
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
            }
        }
    }
});
async function recentsong(id, command) {
    let page;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await getJSON(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=recent&page=${page}&withMetadata=false`);
    const map = await getJSON('https://api.beatsaver.com/maps/hash/'+score.playerScores[0].leaderboard.songHash);
    const diff = score.playerScores[0].leaderboard.difficulty.difficultyRaw.split(/_/);
    const diffPos = getDiffPos(diff, map);
    if (score.playerScores[0].leaderboard.ranked) return `Song: ${score.playerScores[0].leaderboard.songName}\nRank: ${score.playerScores[0].score.rank}\nScore: ${score.playerScores[0].score.baseScore}\nAcc: ${(score.playerScores[0].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}\npp: ${score.playerScores[0].score.pp}`;
    else return `Song: ${score.playerScores[0].leaderboard.songName}\nRank: ${score.playerScores[0].score.rank}\nScore: ${score.playerScores[0].score.baseScore}\nAcc: ${(score.playerScores[0].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}`;
}
async function topsong(id, command) {
    let page;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await getJSON(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=top&page=${page}&withMetadata=false`);
    const map = await getJSON('https://api.beatsaver.com/maps/hash/'+score.playerScores[0].leaderboard.songHash);
    const diff = score.playerScores[0].leaderboard.difficulty.difficultyRaw.split(/_/);
    const diffPos =  getDiffPos(diff, map);
    return `Song: ${score.playerScores[0].leaderboard.songName}\nRank: ${score.playerScores[0].score.rank}\nScore: ${score.playerScores[0].score.baseScore}\nAcc: ${(score.playerScores[0].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}\npp: ${score.playerScores[0].score.pp}`;
}
async function recentsongs(id, command) {
    let page;
    let response = '### recent scores';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await getJSON(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=recent&page=${page}&withMetadata=false`);
    for (let index = 0; index < 8; index++) {
        const map = await getJSON('https://api.beatsaver.com/maps/hash/'+score.playerScores[index].leaderboard.songHash);
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(diff, map);
        if (score.playerScores[index].leaderboard.ranked) {
            response += `\nSong: ${score.playerScores[index].leaderboard.songName}\nRank: ${score.playerScores[index].score.rank}\nScore: ${score.playerScores[index].score.baseScore}\nAcc: ${(score.playerScores[index].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}\npp: ${score.playerScores[index].score.pp}`;
        }
        else {
            response += `\nSong: ${score.playerScores[index].leaderboard.songName}\nRank: ${score.playerScores[index].score.rank}\nScore: ${score.playerScores[index].score.baseScore}\nAcc: ${(score.playerScores[index].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}`;
        }
    }
    return response;
}
async function topsongs(id, command) {
    let page;
    let response = '### top scores';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await getJSON(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=top&page=${page}&withMetadata=false`);
    for (let index = 0; index < 8; index++) {
        const map = await getJSON('https://api.beatsaver.com/maps/hash/'+score.playerScores[index].leaderboard.songHash);
        const diff = score.playerScores[index].leaderboard.difficulty.difficultyRaw.split(/_/);
        const diffPos = getDiffPos(diff, map);
        response += `\nSong: ${score.playerScores[index].leaderboard.songName}\nRank: ${score.playerScores[index].score.rank}\nScore: ${score.playerScores[index].score.baseScore}\nAcc: ${(score.playerScores[index].score.baseScore/map.versions[0].diffs[diffPos].maxScore*100).toFixed(2)}\npp: ${score.playerScores[index].score.pp}`;
    }
    return response;
}
async function register(revoltid, id) {
    try {
        db.read();
        const player = await getJSON(`https://scoresaber.com/api/player/${id}/basic`);
        const name = player.name;
        db.data.users.push({revolt: revoltid, scoresaber: id});
        db.write();
        return `You are now registered as ${name}`;
    }
    catch (error) {
        return 'Invalid profile'
    }
}
function getDiffPos(diff, map) {
    let diffPos = 0;
    for (let index = 0; map.versions[0].diffs[index].difficulty != diff[1]; index++) {
        diffPos = index+1;   
    }
    return diffPos;
}
async function getJSON(url) {
    const response = await fetch(url);
    return response.json();
}
client.loginBot(config.botToken);