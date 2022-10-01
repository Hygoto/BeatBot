import {Client} from "revolt.js";
import {Low, JSONFile} from "lowdb";
import config from "./config.json" assert {type:"json"};
import axios from "axios";
import ScoreData from "./ScoreData.js";

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
    const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+score.playerScores[0].leaderboard.songHash);
    const data = new ScoreData(score.playerScores[0], map);
    return data.response();
}

async function topsong(id, command) {
    let page;
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=1&sort=top&page=${page}&withMetadata=false`);
    const map = await fetchJSONfrom('https://api.beatsaver.com/maps/hash/'+score.playerScores[0].leaderboard.songHash);
    const data = new ScoreData(score.playerScores[0], map);
    return data.response();
}

async function recentsongs(id, command) {
    let page;
    let response = '### recent scores\n';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=recent&page=${page}&withMetadata=false`);
    let hash = Array(score.playerScores[0].leaderboard.songHash, score.playerScores[1].leaderboard.songHash, score.playerScores[2].leaderboard.songHash, score.playerScores[3].leaderboard.songHash, score.playerScores[4].leaderboard.songHash, score.playerScores[5].leaderboard.songHash, score.playerScores[6].leaderboard.songHash, score.playerScores[7].leaderboard.songHash);
    hash.forEach((element, index) => {hash[index] = element.toLowerCase()});
    const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
    let data = Array(8);
    for (let index = 0; index < 8; index++) {
        data[index] = new ScoreData(score.playerScores[index], map[hash[index]]); 
    }
    for (let index = 0; index < 7; index++) {
        response += data[index].response() + '\n';
    }
    response += data[7].response();
    return response;
}

async function topsongs(id, command) {
    let page;
    let response = '### top scores\n';
    if (command.length > 2) {page = command[2];}
    else {page = 1;};
    const score = await fetchJSONfrom(`https://scoresaber.com/api/player/${id}/scores?limit=8&sort=top&page=${page}&withMetadata=false`);
    let hash = Array(score.playerScores[0].leaderboard.songHash, score.playerScores[1].leaderboard.songHash, score.playerScores[2].leaderboard.songHash, score.playerScores[3].leaderboard.songHash, score.playerScores[4].leaderboard.songHash, score.playerScores[5].leaderboard.songHash, score.playerScores[6].leaderboard.songHash, score.playerScores[7].leaderboard.songHash);
    hash.forEach((element, index) => {hash[index] = element.toLowerCase()});
    const map = await fetchJSONfrom(`https://api.beatsaver.com/maps/hash/${hash[0]},${hash[1]},${hash[2]},${hash[3]},${hash[4]},${hash[5]},${hash[6]},${hash[7]}`);
    let data = Array(8);
    for (let index = 0; index < 8; index++) {
        data[index] = new ScoreData(score.playerScores[index], map[hash[index]]); 
    }
    for (let index = 0; index < 7; index++) {
        response += data[index].response() + '\n';
    }
    response += data[7].response();
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