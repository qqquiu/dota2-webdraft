var d2gsi = require('dota2-gsi');
var dota_server = new d2gsi();

const express = require('express');
const express_app = express();
const http = require('http');
const http_server = http.createServer(express_app);
const { Server } = require("socket.io");
const io = new Server(http_server);

const path = require('path');

express_app.use(express.static('public'));

const
    radiant = "team2",
    dire    = "team3",
    picks   = 5,
    bans    = 7,
    unselected = 0;

const
    GS_INIT     = "DOTA_GAMERULES_STATE_INIT",
    GS_WAIT     = "DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD",
    GS_DRAFT    = "DOTA_GAMERULES_STATE_HERO_SELECTION",
    GS_STRAT    = "DOTA_GAMERULES_STATE_STRATEGY_TIME",
    GS_SHOW     = "DOTA_GAMERULES_STATE_TEAM_SHOWCASE",
    GS_PRE      = "DOTA_GAMERULES_STATE_PRE_GAME",
    GS_INGAME   = "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
    GS_POST     = "DOTA_GAMERULES_STATE_POST_GAME",
    GS_LAST     = "DOTA_GAMERULES_STATE_LAST",
    GS_DC       = "DOTA_GAMERULES_STATE_DISCONNECT";

radiant_bans  = new Array(7).fill(unselected);
dire_bans     = new Array(7).fill(unselected);
radiant_picks = new Array(5).fill(unselected);
dire_picks    = new Array(5).fill(unselected);
draftStarted  = false;

express_app.get('', (req, res) =>
{
    res.sendFile(path.join(__dirname + '/draft.html'));
});

http_server.listen(8080, () => 
{
        console.log('http://localhost:8080/draft.html');
});

dota_server.events.on('newclient', function(client) {

    client.on('newdata', data => {
        try
        {
            switch(data.map.game_state)
            {
                case GS_DRAFT:
                case GS_STRAT:
                {
                    if (!draftStarted)
                    {
                        draftStarted = true;
                    }
                UpdateDraft(data.draft, data.previously.draft ? data.previously.draft : false);
                break;
                }
            }
        }
        catch(err) 
        {
            console.log(err);
            return;
        }
    });
});

function UpdateDraft(draft, delta)
{
    UpdateActiveTeam(draft.activeteam);
    UpdateDraftTime(draft.activeteam_time_remaining, draft.radiant_bonus_time, draft.dire_bonus_time);
    if (delta) UpdateDraftPicks(draft.team2, draft.team3, delta);
}

function UpdateActiveTeam(team, ispick)
{
    io.emit("ActiveTeam", team);
}

function UpdateDraftTime(time, radiant, dire)
{
    radiant_min = ~~(radiant / 60);
    radiant_sec = radiant % 60;
    dire_min = ~~(dire / 60);
    dire_sec = dire % 60;
    io.emit("UpdateTimer", time, radiant_min, radiant_sec, dire_min, dire_sec);
}

function UpdateDraftPicks(radiant, dire, delta)
{
    if (delta.team2)
    {
        const changes = Object.keys(delta.team2)
            .filter((key) => key.includes("class"));

        for (const c of changes)
        {
            new_c = c.slice(0, -6); // remove _class from end of string
            io.emit("NewSelection", "radiant", new_c, radiant[c]);
        }
    }

    if (delta.team3)
    {
        const changes = Object.keys(delta.team3)
            .filter((key) => key.includes("class"));

        for (const c of changes)
        {
            new_c = c.slice(0, -6); // remove _class from end of string
            io.emit("NewSelection", "dire", new_c, dire[c]);
        }
    }
}
