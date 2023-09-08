![image](https://github.com/qqquiu/dota2-webdraft/assets/13590967/5ae7c31f-2394-43de-8caa-649b7c53e350)

## Pre-requisites
- `git` for command-line
- `node.js` minimum version `18.17.1`

## Usage
- Open a command line/terminal and navigate to your desired folder
- `git clone https://github.com/qqquiu/dota2-webdraft`
- `cd dota2-webdraft`
- `npm install`
- Copy the `gamestate_integration_dota2-gsi` file to `<dota 2 install folder>\game\dota\cfg\gamestate_integration`
- Add `-gamestateintegration` to your Dota 2 launch parameters
- Run `main.js` using node and connect to a live match or replay
- Draft page can be opened on `http://localhost:8080/draft.html` using OBS, etc.
