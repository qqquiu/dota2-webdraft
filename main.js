/*
import express from 'express';
import { DOTA2GSI } from 'dotagsi';

// TODO: Use import and not require
*/
// Dota 2 GSI stuff
var d2gsi = require('dota2-gsi');
var dota_server = new d2gsi();

// Web framework + sockets
const express = require('express');
const express_app = express();
const http = require('http');
const http_server = http.createServer(express_app);
const { Server } = require("socket.io");
const io = new Server(http_server);

// Server
const path = require('path');
express_app.use(express.static('public'));

express_app.get('/panel', (req, res) =>
{
    res.sendFile(path.join(__dirname + '/panel.html'));
});

express_app.get('/draft', (req, res) =>
{
    res.sendFile(path.join(__dirname + '/draft.html'));
});

express_app.get('/ingame', (req, res) =>
{
    res.sendFile(path.join(__dirname + '/ingame.html'));
});

http_server.listen(8080, () => 
{
    console.log("Control Panel: %s", "http://localhost:8080/panel");
});

// Some globals to help further on
const [RADIANT, DIRE, RADIANT_ACTIVE, DIRE_ACTIVE, TOTAL_PICKS, TOTAL_BANS] = ["team2", "team3", 2, 3, 5, 7];
const [GS_INIT, GS_WAIT, GS_DRAFT, GS_STRAT, GS_SHOW, GS_PRE, GS_INGAME, GS_POST, GS_LAST, GS_DC] =
    [
        "DOTA_GAMERULES_STATE_INIT",
        "DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD",
        "DOTA_GAMERULES_STATE_HERO_SELECTION",
        "DOTA_GAMERULES_STATE_STRATEGY_TIME",
        "DOTA_GAMERULES_STATE_TEAM_SHOWCASE",
        "DOTA_GAMERULES_STATE_PRE_GAME",
        "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
        "DOTA_GAMERULES_STATE_POST_GAME",
        "DOTA_GAMERULES_STATE_LAST",
        "DOTA_GAMERULES_STATE_DISCONNECT"
    ];

var RADIANT_PICKS       = new Set();
var DIRE_PICKS          = new Set();
var RADIANT_BANS        = new Set();
var DIRE_BANS           = new Set();
var FIRST_PICK          = null;
var DRAFT_FIRST_LOAD    = false;

var clients = [];

io.on("connection", (socket) => {
    // Called by the draft.html page to get data in case it's reloaded (ie F5)
    // TODO: this needs to be called only from Draft.html
    socket.on("RequestDraft", () => {
        poll_draft();
        io.emit("StartDraft", {
            first_pick:     FIRST_PICK,
            radiant_bans:   Array.from(RADIANT_BANS),
            radiant_picks:  Array.from(RADIANT_PICKS),
            dire_bans:      Array.from(DIRE_BANS),
            dire_picks:     Array.from(DIRE_PICKS)
        });
    })
})

dota_server.events.on('newclient', async function(client) {
    //console.log("Host %s connected using token \"%s\"", client.ip, client.auth.token);
    clients.push(client);
    //if (client.gamestate.map.matchid) console.log("Receiving data from Match ID %s", client.gamestate.map.matchid);

    client.on('newdata', async function(data) {
        try
        {
            switch (data.map.game_state)
            {
                case GS_DRAFT:
                    {
                        if (data.draft) {
                            if (!DRAFT_FIRST_LOAD) {
                                DRAFT_FIRST_LOAD = true;
                                parse_draft(data.draft);
                                break;
                            }
                            update_draft(data.draft, data.previously.draft ? data.previously.draft : false);
                            break;
                        }
                    }
                case GS_STRAT:
                    {
                        console.log("Strategy time!");
                        break;
                    }
            }
        }
        catch(err) 
        {
            //console.log(err);
            return;
        }
    });
});

async function poll_draft() {
    if (clients[0].auth.token == "production") {
        var draft = clients[0].gamestate.draft;
        if (draft) parse_draft(draft);
    }
    else {
        console.log("Couldn't poll draft data (no clients on this token)");
    }
}

async function parse_draft(draft) {
    if (!draft) return; 

    // Extract only the hero names from a specific team's draft
    function extract_draft(team_draft, picks, bans) {
        for ( const key in team_draft ) {
            const value = team_draft[key];
            if (value == '') continue;
            if ( /^pick\d+_class$/.test( key ))
            {
                picks.add( value );
                continue;
            }
            if ( /^ban\d+_class$/.test( key ))
            {
                bans.add( value );
                continue;
            }
        }
    }

    FIRST_PICK = draft[RADIANT].home_team ? RADIANT : DIRE;
    RADIANT_BANS.clear();
    RADIANT_PICKS.clear();
    DIRE_BANS.clear();
    DIRE_PICKS.clear();

    extract_draft( draft[RADIANT], RADIANT_PICKS, RADIANT_BANS );
    extract_draft( draft[DIRE], DIRE_PICKS, DIRE_BANS );
}

async function update_draft( draft, delta ) {
    switch ( draft.activeteam ) {
        case RADIANT_ACTIVE:
            set_active_team( RADIANT );
            break;
        case DIRE_ACTIVE:
            set_active_team( DIRE );
            break;
    }
    
    set_timers( draft.activeteam_time_remaining, draft.radiant_bonus_time, draft.dire_bonus_time );
    
    if ( delta ) set_draft( draft[RADIANT], draft[DIRE], delta );
}

async function set_active_team( team ) {
    io.emit( "ActiveTeam", team );
}

async function set_timers( active_time, radiant_reserve, dire_reserve ) {
    const r_min = ~~(radiant_reserve / 60);
    const r_sec = radiant_reserve % 60;
    const d_min = ~~(dire_reserve / 60);
    const d_sec = dire_reserve % 60;
    io.emit("UpdateTimers", active_time, r_min, r_sec, d_min, d_sec);
}

async function set_draft( radiant, dire, delta ) {
    if ( !delta ) return;

    if ( delta[RADIANT] )
    {
        const changes = Object.keys(delta.team2)
            .filter((key) => key.includes("class"));

        for (const c of changes)
        {
            new_c = c.slice(0, -6); // remove _class from end of string
            io.emit("NewSelection", "radiant", new_c, radiant[c]);
        }
    }

    if ( delta[DIRE] )
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