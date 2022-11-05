export default class ScoreData {
    hash;
    id;
    song;
    diff;
    rank;
    score;
    acc;
    scoreid;
    timeSet;
    ranked;
    starRating;
    pp;
    ppWeighted;

    constructor(score, map) {
        if (map != undefined) {
            this.hash = score.leaderboard.songHash.toLowerCase();
            this.id = map.id;
            this.song = score.leaderboard.songName;
            this.diff = score.leaderboard.difficulty.difficultyRaw.split(/_/);
            this.rank = score.score.rank;
            this.score = score.score.baseScore;
            const diffPos = this.getDiffPos(map);
            this.acc = (this.score/map.versions[diffPos[0]].diffs[diffPos[1]].maxScore*100).toFixed(2);
            const isoTime = new Date(score.score.timeSet);
            this.timeSet = isoTime.getTime()/1000;
            this.ranked = score.leaderboard.ranked;
            if (this.ranked) {
                this.starRating = score.leaderboard.stars;
                this.pp = score.score.pp;
                this.ppWeighted = (this.pp*score.score.weight).toFixed(2);
            }
            if (this.diff[2] === 'SoloStandard') this.diff[2] = '';
            else this.diff[2] = this.diff[2].substr(4) + ' ';
        }
        else {
            this.id = score.leaderboard.song.id;
            this.song = score.leaderboard.song.name;
            this.diff = ['', score.leaderboard.difficulty.difficultyName, score.leaderboard.difficulty.modeName + ' '];
            this.rank = score.rank;
            this.score = score.baseScore;
            this.acc = (this.score/score.leaderboard.difficulty.maxScore*100).toFixed(2);
            this.scoreid = score.id;
            this.timeSet = score.timeset;
            if (score.leaderboard.song.difficulties[0].status > 1) {
                this.ranked = true;
                this.starRating = score.leaderboard.song.difficulties[0].stars.toFixed(2);
                this.pp = score.pp.toFixed(2);
                this.ppWeighted = (score.pp*score.weight).toFixed(2);
            }
        }
    }

    response() {
        const diffColor = this.getDiffColor(this.diff[1])
        let content = (
            `[${this.song}](<https://beatsaver.com/maps/${this.id}>) ${this.diff[2]}$\\color{${diffColor}}\\textsf{${this.diff[1]}}$\n` +
            `#${this.rank}\n` +
            `set <t:${this.timeSet}:R>\n`+
            `Score: ${this.score}\n` +
            `${this.acc}%`
        );
        if (this.ranked) content += (
            `\n${this.starRating}★\n` +
            `${this.pp}pp (${this.ppWeighted}pp)`
        );
        if (this.scoreid != null) content += `\n[replay](<https://replay.beatleader.xyz/?scoreId=${this.scoreid}>)`
        return content;
    }

    getDiffPos(map) {
        let diffPos = [0, 0];
        diffPos[0] = map.versions.findIndex((value) => (value.hash === this.hash));
        diffPos[1] = map.versions[diffPos[0]].diffs.findIndex(
            (value) => (value.difficulty === this.diff[1] && `Solo${value.characteristic}` === this.diff[2])
        );
        return diffPos;
    }

    getDiffColor(diff) {
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
}