export default class ScoreData {
    hash;
    id;
    song;
    diff;
    rank;
    score;
    acc;
    timeSet;
    ranked;
    starRating;
    pp;
    ppWeighted;

    constructor(score, map) {
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
    }

    response() {
        const diffColor = this.getDiffColor(this.diff[1])
        let content = (
            `Song: [${this.song}](<https://beatsaver.com/maps/${this.id}>)  $\\color{${diffColor}}\\textsf{${this.diff[1]}}$\n` +
            `Rank: ${this.rank}\n` +
            `Time set: <t:${this.timeSet}:R>\n`+
            `Score: ${this.score}\n` +
            `Acc: ${this.acc}%`
            );
        if (this.ranked) content += (
            `\nStar Rating: ${this.starRating}★\n` +
            `pp: ${this.pp} (${this.ppWeighted})`
        );
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