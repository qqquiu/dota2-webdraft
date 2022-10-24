var socket = io();

current_time = document.getElementById("current_time");
radiant_reserve = document.getElementById("radiant_reserve");
dire_reserve = document.getElementById("dire_reserve");

current_team = document.getElementById("current_team");
info = document.getElementById("center_info");
var active_team;

socket.on("DraftStart", () =>
{
});

socket.on("ActiveTeam", (team) =>
{
    active_team = team;
    switch (active_team)
    {
        case 2:
        {
            current_team.innerText = "‹";
            info.classList.remove("dire");
            info.classList.add("radiant");
            break;
        }
        case 3:
        {
            current_team.innerText = "›";
            info.classList.remove("radiant");
            info.classList.add("dire");
            break;
        }
        default:
        {
            break;
        }
    }
});

socket.on("UpdateTimer", (current, radiant_min, radiant_sec, dire_min, dire_sec) => 
{
    current_time.innerText = current;
    radiant_reserve.innerText = radiant_min + ":" + AddLeadingZero(radiant_sec);
    dire_reserve.innerText = dire_min + ":" + AddLeadingZero(dire_sec);

    if (current > 0)
    {
        radiant_reserve.classList.remove("active");
        dire_reserve.classList.remove("active");
        current_time.classList.add("active");
        current_time.innerText = current;
    }
    else
    {
        current_time.classList.remove("active");
        switch (active_team)
        {
            case 2:
            {
                dire_reserve.classList.remove("active");
                radiant_reserve.classList.add("active");
                break;
            }
            case 3:
            {
                radiant_reserve.classList.remove("active");
                dire_reserve.classList.add("active");
                break;
            }
            default:
            {
                break;
            }
        }
    }    
});

socket.on("NewSelection", (team, type, hero) => 
{
    const type_check = type.slice(0, -1); // remove digit from end of string
    const el = document.getElementById(team + "_" + type);
    const child = el.firstElementChild;

    switch(type_check)
    {
        case "pick":
        {
            child.src = "assets/picks/" + hero + ".webm";
            break;
        }
        case "ban":
        {
            child.src = "assets/bans/" + hero + ".png";
            child.style.display = "block";
            break;
        }
    }

    child.style.opacity = "1";
});

function AddLeadingZero(number)
{
    return number < 10 ? ("0" + number) : number;
}