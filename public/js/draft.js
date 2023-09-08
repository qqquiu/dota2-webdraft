const [RADIANT, DIRE                ] = ["team2, team3"];
const [RADIANT_ACTIVE, DIRE_ACTIVE  ] = [2, 3];
const [LEFT_ARROW, RIGHT_ARROW      ] = ["‹", "›"];
const [PICK_PREFIX, PICK_SUFFIX     ] = ["/assets/picks/", ".webm"];
const [BAN_PREFIX, BAN_SUFFIX       ] = ["/assets/bans/", ".png"];

let draft_order = [];
let draft_index = 0;
let max_heroes; // We will read this from the game mode JSON

document.addEventListener("DOMContentLoaded", async function () {
    const   el_SelectionTeam    = document.getElementById("current_team");
    const   el_SelectionTime    = document.getElementById("current_time");
    const   el_ReserveRadiant   = document.getElementById("radiant_reserve");
    const   el_ReserveDire      = document.getElementById("dire_reserve");
    const   el_CenterInfo       = document.getElementById("center_info");
    const   socket              = io();

    // Page is loaded, so we request server for the draft information (first pick, picks & bans)
    socket.emit("RequestDraft");
    const draft = await new Promise((resolve) => {
        socket.once("InitDraft", (draft) => {
            resolve(draft);
        });
    });

    // We need the draft object from above to proceed properly
    try {
        const cm = await LoadJSON("/data/captains_mode.json");
        if (cm) {
            max_heroes = cm.max_heroes;

            const is_radiant_fp = (draft.first_pick == RADIANT);
            cm.draft.forEach((phase) => {
                phase.selections.forEach((selection) => {
                    const team = is_radiant_fp ? (selection.team === "first" ? "radiant" : "dire") : (selection.team === "first" ? "dire" : "radiant");
                    const el_id = `${team}_${selection.type}${selection.id}`;
                    const e = document.getElementById(el_id);
                    draft_order.push(e);
                });
            });

        }
    } catch (error) {
        console.error(error);
    }

    // We need the hero elements object to proceed
    try {
        const hero_elements = await LoadJSON("/data/hero_element_ids.json");

        function set_selections(selections, action, element_ids) {
            selections.forEach((hero, index) => {
                const el = document.getElementById(element_ids[index]).firstElementChild;
                action(hero, el);
            })
        }

        function set_pick(hero_name, el) {
            el.src = PICK_PREFIX + hero_name + PICK_SUFFIX;
            selection_made();
        }
        
        function set_ban(hero_name, el) {
            el.src = BAN_PREFIX + hero_name + BAN_SUFFIX;
            selection_made();
        }

        if (hero_elements) {
            set_selections(draft.radiant_bans,  set_ban,    hero_elements.radiant.bans);
            set_selections(draft.dire_bans,     set_ban,    hero_elements.dire.bans);
            set_selections(draft.radiant_picks, set_pick,   hero_elements.radiant.picks);
            set_selections(draft.dire_picks,    set_pick,   hero_elements.dire.picks);
        }
    } catch (error) {
        console.error(error);
    }

    socket.on("UpdateDraftState", function(state) {
        if (!state.active_team) {
            console.log("Draft didn't start");
            return;
        }

        // Change background and side indicator
        // Change timer styling
        el_ReserveRadiant.innerText = state.radiant_reserve;
        el_ReserveDire.innerText    = state.dire_reserve;
    
        if (state.active_time) {
            el_SelectionTime.innerText = state.active_time;
            el_ReserveRadiant.classList.remove("active");
            el_ReserveDire.classList.remove("active");
            el_SelectionTime.classList.add("active");
            switch (state.active_team) {
                case RADIANT_ACTIVE:
                    el_SelectionTeam.innerText = LEFT_ARROW;
                    break;
                case DIRE_ACTIVE:
                    el_SelectionTeam.innerText = RIGHT_ARROW;
                    break;
            }
        }
        else {
            el_SelectionTime.classList.remove("active");
            switch (state.active_team) {
                case RADIANT_ACTIVE:
                    el_SelectionTeam.innerText = LEFT_ARROW;
                    el_ReserveRadiant.classList.add("active");
                    el_ReserveDire.classList.remove("active");
                    break;
                case DIRE_ACTIVE:
                    el_SelectionTeam.innerText = RIGHT_ARROW;
                    el_ReserveDire.classList.add("active");
                    el_ReserveRadiant.classList.remove("active");
                    break;
            }
        }
    });
    
    socket.on("NewSelection", async function(selection) {
        const hero = selection.hero;
        const el = draft_order[draft_index].firstElementChild;
        if (el.tagName === "IMG") {
            el.src = BAN_PREFIX + hero + BAN_SUFFIX;
        }
        else {
            el.src = PICK_PREFIX + hero + PICK_SUFFIX;
        }
        selection_made();
    });
})

async function LoadJSON(file) {
    return new Promise((resolve, reject) => {
        fetch(file)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to load: " + file);
            }
            return response.json();
        })
        .then((data) => {
            resolve(data);
        })
        .catch((error) => {
            reject(error);
        });
    });
}

function end_draft() {
    console.log("Draft ended");
}

function selection_made() {
    draft_order[draft_index].firstElementChild.style.opacity = 1;
    draft_order[draft_index].classList.remove("active");
    draft_index++;
    if (draft_index === max_heroes) end_draft();
    draft_order[draft_index].classList.add("active");
}