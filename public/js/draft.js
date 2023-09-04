var socket = io();

const CURRENT_TIME      = document.getElementById("current_time");
const RADIANT_RESERVE   = document.getElementById("radiant_reserve");
const DIRE_RESERVE      = document.getElementById("dire_reserve");
const ACTIVE_ARROW      = document.getElementById("current_team");
const CENTER_INFO       = document.getElementById("center_info");
const RADIANT           = "team2";
const DIRE              = "team3";
const PICK_PREFIX       = "/assets/picks/";
const PICK_SUFFIX       = ".webm";
const BAN_PREFIX        = "/assets/bans/";
const BAN_SUFFIX        = ".png";
const MAX_HEROES        = 24;

var ACTIVE_TEAM;
var FIRST_PICK;

var DRAFT_POINTER       = 0;
var DRAFT_ORDER         = []; // Need to calculate this on first load

const RADIANT_PICKS_EL = [
    document.getElementById("radiant_pick0").firstElementChild,
    document.getElementById("radiant_pick1").firstElementChild,
    document.getElementById("radiant_pick2").firstElementChild,
    document.getElementById("radiant_pick3").firstElementChild,
    document.getElementById("radiant_pick4").firstElementChild,
],
DIRE_PICKS_EL = [
    document.getElementById("dire_pick0").firstElementChild,
    document.getElementById("dire_pick1").firstElementChild,
    document.getElementById("dire_pick2").firstElementChild,
    document.getElementById("dire_pick3").firstElementChild,
    document.getElementById("dire_pick4").firstElementChild,
],
RADIANT_BANS_EL = [
    document.getElementById("radiant_ban0").firstElementChild,
    document.getElementById("radiant_ban1").firstElementChild,
    document.getElementById("radiant_ban2").firstElementChild,
    document.getElementById("radiant_ban3").firstElementChild,
    document.getElementById("radiant_ban4").firstElementChild,
    document.getElementById("radiant_ban5").firstElementChild,
    document.getElementById("radiant_ban6").firstElementChild,
],
DIRE_BANS_EL = [
    document.getElementById("dire_ban0").firstElementChild,
    document.getElementById("dire_ban1").firstElementChild,
    document.getElementById("dire_ban2").firstElementChild,
    document.getElementById("dire_ban3").firstElementChild,
    document.getElementById("dire_ban4").firstElementChild,
    document.getElementById("dire_ban5").firstElementChild,
    document.getElementById("dire_ban6").firstElementChild,
]

function Initialize() {
    const ban_imgs = document.querySelectorAll(".ban_img");
    const pick_videos = document.querySelectorAll(".pick_video");

    ban_imgs.forEach((ban_img) => {
        ban_img.addEventListener("load", () => {
            ban_img.style.opacity = 1;
            ban_img.style.display = "block";
        })
    })

    pick_videos.forEach((pick_video) => {
        pick_video.addEventListener("loadedmetadata", () => {
            pick_video.style.opacity = 1;
        })
    })
}

async function LoadDraft() {
    socket.emit("RequestDraft");
    Initialize();
}

socket.once("StartDraft", function(draft) {
    FIRST_PICK = draft.first_pick;
    CENTER_INFO.classList.add(FIRST_PICK == RADIANT? "radiant" : "dire");

    draft.radiant_bans.forEach((hero, index) => {
        update_ban(hero, RADIANT_BANS_EL[index]);
    });

    draft.dire_bans.forEach((hero, index) => {
        update_ban(hero, DIRE_BANS_EL[index]);
    });

    draft.radiant_picks.forEach((hero, index) => {
        update_pick(hero, RADIANT_PICKS_EL[index]);
    });

    draft.dire_picks.forEach((hero, index) => {
        update_pick(hero, DIRE_PICKS_EL[index]);
    });

    // Terrible draft order time!
    let fp, sp;
    if (FIRST_PICK == RADIANT) {
        fp = "radiant";
        sp = "dire";
    }
    else {
        fp = "dire";
        sp = "radiant";
    }
    // This is so disgusting I hope it does not work so I have to think more
    let first = document.getElementById(`${fp}_ban0`);
    first.classList.add("active");
    // Ban phase #1
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban0`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban0`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban1`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban1`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban2`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban3`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban2`));
    // Pick phase #1
    DRAFT_ORDER.push(document.getElementById(`${fp}_pick0`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_pick0`));
    // Ban phase #2
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban3`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban4`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban4`));
    // Pick phase #2
    DRAFT_ORDER.push(document.getElementById(`${sp}_pick1`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_pick1`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_pick2`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_pick2`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_pick3`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_pick3`));
    // Ban phase #3
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban5`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban5`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_ban6`));
    DRAFT_ORDER.push(document.getElementById(`${fp}_ban6`));
    // Pick phase #3
    DRAFT_ORDER.push(document.getElementById(`${fp}_pick4`));
    DRAFT_ORDER.push(document.getElementById(`${sp}_pick4`));
});

socket.on("ActiveTeam", (active) => {
    ACTIVE_TEAM = active;
    switch (ACTIVE_TEAM)
    {
        case RADIANT:
        {
            ACTIVE_ARROW.innerText = "‹";
            CENTER_INFO.classList.replace("dire", "radiant");
            break;
        }
        case DIRE:
        {
            ACTIVE_ARROW.innerText = "›";
            CENTER_INFO.classList.replace("radiant", "dire");
            break;
        }
        default:
        {
            break;
        }
    }
});

socket.on("UpdateTimers", (active_time, r_min, r_sec, d_min, d_sec) => {
    CURRENT_TIME.innerText = active_time;
    RADIANT_RESERVE.innerText = r_min + ":" + add_leading_zero(r_sec);
    DIRE_RESERVE.innerText = d_min + ":" + add_leading_zero(d_sec);

    if (active_time)
    {
        RADIANT_RESERVE.classList.remove("active");
        DIRE_RESERVE.classList.remove("active");
        CURRENT_TIME.classList.add("active");
    }
    else
    {
        CURRENT_TIME.classList.remove("active");
        switch (ACTIVE_TEAM)
        {
            case RADIANT:
            {
                RADIANT_RESERVE.classList.add("active");
                DIRE_RESERVE.classList.remove("active");                
                break;
            }
            case DIRE:
            {
                DIRE_RESERVE.classList.add("active");
                RADIANT_RESERVE.classList.remove("active");                
                break;
            }
            default:
            {
                break;
            }
        }
    }    
});

socket.on("NewSelection", (team, type, hero) => {
    const type_check = type.slice(0, -1); // remove digit from end of string
    const el = document.getElementById(team + "_" + type);
    const child = el.firstElementChild;

    switch(type_check)
    {
        case "pick":
        {
            update_pick(hero, child);
            break;
        }
        case "ban":
        {
            update_ban(hero, child);
            break;
        }
    }
});

socket.on("NewPick", (hero, team) => {
    let element;
    switch (team)
    {
        case RADIANT:
            {
                break;
            }
        case DIRE:
            {
                break;
            }
    }
    //update_pick(hero, element);
});

socket.on("NewBan", (hero, team) => {
    //update_pick(hero, team);
});

async function update_pick(hero, element) {
    element.src = PICK_PREFIX + hero + PICK_SUFFIX;
    selection_made();
}

async function update_ban(hero, element) {
    element.src = BAN_PREFIX + hero + BAN_SUFFIX;
    selection_made();
}

async function selection_made() {
    DRAFT_ORDER[DRAFT_POINTER].classList.remove("active");
    DRAFT_POINTER++;
    DRAFT_ORDER[DRAFT_POINTER].classList.add("active");
}

function add_leading_zero(n) {
    return n < 10 ? ("0" + n) : n;
}