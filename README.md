![draft](https://user-images.githubusercontent.com/13590967/197571003-cd1672a3-1f6d-401b-bc52-f3414e333c4b.png)

## Usage
- Open a command line/terminal and navigate to your desired folder
- `git clone https://github.com/qqquiu/dota2-webdraft`
- `cd dota2-webdraft`
- `npm install`
- Copy the `gamestate_integration_dota2-gsi` file to `<dota 2 install folder>\game\dota\cfg\gamestate_integration`
- Add `-gamestateintegration` to your Dota 2 launch parameters
- Run `main.js` using node and the contron panel webpage will be available at `http://localhost:8080/panel.html`
- From the control panel, you can copy links to different pages such as draft, ingame, and whatever else may exist.