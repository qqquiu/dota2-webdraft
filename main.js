// TODO: Use import and not require
/*
import express from 'express';
import { DOTA2GSI } from 'dotagsi';
import moment from 'moment';
*/

// Dota 2 GSI stuff
let d2gsi = require('dota2-gsi');
let dota_server = new d2gsi();

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

express_app.get('/draft', (req, res) =>
{
    res.sendFile(path.join(__dirname + '/draft.html'));
});

http_server.listen(8080, () => 
{
    //console.log("Control Panel: %s", "http://localhost:8080/panel");
});

// Some globals to help further on
const [RADIANT, DIRE] = ["team2", "team3"];
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

let clients = new Set();
let hosts = new Set();

io.on("connection", (socket) => {
    // Called by the draft.html page to get data in case it's reloaded (ie F5)
    // TODO: this needs to be called only from Draft.html
    socket.on("RequestDraft", async () => {
        let draft = await poll_draft();
        if (draft) io.emit("InitDraft", draft);
    })
})

dota_server.events.on('newclient', function(client) {
    hosts.add({hostname: client.ip, token: client.auth.token});
    clients.add(client);

    client.on('newdata', function(data) {
        try {
            switch (data.map.game_state) {
                case GS_DRAFT:
                    update_draft(data.draft, data.previously.draft);
                    console.log(data.player);
                    console.log(data.hero);
                    break;
                case GS_STRAT:
                    //console.log("Strategy time!");
                    break;
            }
        }
        catch(err) {
            //console.log(err);
            return;
        }
    });
});

function poll_draft() {
    // TODO: Update this code to try and test multiple clients using auth tokens for different matches
    let draft;
    if (clients.size > 0) {
        const client = clients.values().next().value;
        if (client && client.gamestate) {
            if (client.gamestate.draft) 
                draft = client.gamestate.draft;
            else
                return null;
        }
    }

    // Helper to extract only the hero names from a specific team's draft
    function extract_draft(team_draft) {
        let picks = [];
        let bans = [];
        for (const key in team_draft) {
            const hero = team_draft[key];
            if (hero == '') continue;
            if (/^pick\d+_class$/.test(key)) {
                picks.push(hero);
                continue;
            }
            if (/^ban\d+_class$/.test(key)) {
                bans.push(hero);
                continue;
            }
        }
        return {
            picks: picks,
            bans: bans
        }
    }

    set_draft_state(draft.activeteam, draft.activeteam_time_remaining, draft.radiant_bonus_time, draft.dire_bonus_time);
    const fp = draft[RADIANT].home_team ? RADIANT : DIRE;
    const {picks: rp, bans: rb} = extract_draft(draft[RADIANT]);
    const {picks: dp, bans: db} = extract_draft(draft[DIRE]);

    return {
        first_pick:     fp,
        radiant_bans:   rb,
        radiant_picks:  rp,
        dire_bans:      db,
        dire_picks:     dp,
    }
}

function set_draft_state(team, time, radiant_reserve, dire_reserve) {
    const rr = String(~~(radiant_reserve / 60)) + ":" + add_leading_zero(radiant_reserve % 60);
    const dr = String(~~(dire_reserve / 60)) + ":" + add_leading_zero(dire_reserve % 60);  

    const state = {
        active_team: team,
        active_time: time,
        radiant_reserve: rr,
        dire_reserve: dr
    }

    if (state.active_team) io.emit("UpdateDraftState", state);
}

function filter_draft_changes(draft, previously) {
    function parse_changes(draft, previously, team) {
        const suffix = "_class";
        const changes = Object.keys(previously[team]).filter((key) => key.endsWith(suffix));
        if (!changes) console.log("WTF: This shouldn't happen");

        const type_pattern = new RegExp(`^(ban|pick)(\\d+)(?=${suffix}$)`);

        for (const changed of changes) {
            const match = changed.match(type_pattern)
            if (match) {
                const type = match[1];
                const id = match[2];
                if (draft[team][changed] === '') return;
                
                // We emit all data here, even though client page ideally only needs the type (pick/ban) and hero name
                io.emit("NewSelection", {
                    team: team === RADIANT ? "radiant" : "dire",
                    type: type,
                    id:   id,
                    hero: draft[team][changed]
                })
            }
        }
    }

    if (previously[RADIANT]) parse_changes(draft, previously, RADIANT);
    if (previously[DIRE]) parse_changes(draft, previously, DIRE);
}

function update_draft(draft, previously) {
    set_draft_state(draft.activeteam, draft.activeteam_time_remaining, draft.radiant_bonus_time, draft.dire_bonus_time);    
    if (previously) filter_draft_changes(draft, previously);
}

function add_leading_zero(n) {
    return n < 10 ? ("0" + n) : n;
}