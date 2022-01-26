import{load,init}from"./audio/load.js";import{resetElements,updateVersion}from"./util/util.js";import Playlist from"./playlist/Playlist.js";const params=new URLSearchParams(window.location.search),queryURL=params.get("url");let queryImport=params.get("import"),selectToggle,exportButton,importButton,importSelect,fileSelect,urlSelectParent,urlSelect,urlSelectLoad,playlist,playlistOrder,playbackButton,resetButton,repeatButton,progressBar,loopingCheck,parityCheck,noSleep;async function fetchURL(e){let t;try{var a=new URL(e),l=await fetch(a);l.ok&&(t=l)}catch{}return t}async function loadURL(e){const t=await fetchURL(e);t&&loadSongs([{name:e,buffer:await t.arrayBuffer()}])}async function fetchImport(e){const t=await fetchURL(e);loadImport(await t.text())}async function loadImport(e){e=JSON.parse(e),e=await playlist.import(e);setRepeat(e.repeatMode),await loadSongs(e.songs,!1);e=playlistOrder.children[e.playing].innerHTML;playlist.switchTo(e)}async function loadSongs(e,t=!0){await playlist.resetAll(),setPlaying(!1);for(const a of e)await loadSong(a.name,a.buffer);t&&playlist.currentPlayer.element.classList.add("playing"),setReady(!0)}async function loadSong(e,t){var a=await load(t);playlist.createPlayer(a,t,e)}function setReady(e){e?(playbackButton.disabled=!1,resetButton.disabled=!1,repeatButton.disabled=!1,progressBar.disabled=!1,parityCheck.disabled=!1):(playbackButton.disabled=!0,resetButton.disabled=!0,repeatButton.disabled=!0,progressBar.disabled=!0,loopingCheck.disabled=!0,parityCheck.disabled=!0)}function setUseURL(e){e?(selectToggle.dataset.toggled="true",importButton.dataset.url="true",fileSelect.classList.add("invisible"),urlSelect.value=null,urlSelectParent.classList.add("visible")):(delete selectToggle.dataset.toggled,delete importButton.dataset.url,fileSelect.classList.remove("invisible"),urlSelectParent.classList.remove("visible"),fileSelect.value=null,params.delete("url"),params.delete("import"),updateHistory())}function setPlaying(e){e?(playlist.currentPlayer?.play(),playbackButton.dataset.toggled="true",noSleep.enable()):(playlist.currentPlayer?.pause(),delete playbackButton.dataset.toggled,noSleep.disable())}function setRepeat(e){switch(playlist.repeatMode=e){case 0:delete repeatButton.dataset.status;break;case 1:repeatButton.dataset.status="one";break;case 2:repeatButton.dataset.status="playlist"}}function updateHistory(){window.history.replaceState({},"",window.location.pathname+"?"+params.toString())}window.addEventListener("load",async()=>{selectToggle=document.getElementById("select-toggle"),exportButton=document.getElementById("export"),importButton=document.getElementById("import"),importSelect=document.getElementById("import-select"),fileSelect=document.getElementById("file-select"),urlSelectParent=document.getElementById("url-select-parent"),urlSelect=document.getElementById("url-select"),urlSelectLoad=document.getElementById("url-select-load"),progressBar=document.getElementById("progress-bar"),playlistOrder=document.getElementById("playlist-order"),playbackButton=document.getElementById("playback-button"),resetButton=document.getElementById("reset-button"),repeatButton=document.getElementById("repeat-button"),loopingCheck=document.getElementById("looping-check"),parityCheck=document.getElementById("parity-check"),playlist=new Playlist,setReady(!1),(queryURL||queryImport)&&(setUseURL(!0),urlSelect.dataset.ignore="true",urlSelect.value=queryURL,queryImport?fetchImport(queryImport):loadURL(queryURL)),resetElements(),updateVersion(),delete urlSelect.dataset.ignore,noSleep=new NoSleep,selectToggle.addEventListener("click",()=>{setUseURL("true"!==selectToggle.dataset.toggled)}),exportButton.addEventListener("click",()=>{playlist.export()}),importButton.addEventListener("click",async()=>{var e;importButton.dataset.url?(e=window.prompt("Insert url"),queryImport=e,params.delete("url"),params.set("import",e),updateHistory(),fetchImport(e)):importSelect.click()}),importSelect.addEventListener("change",async()=>{0!==importSelect.files.length&&loadImport(await importSelect.files[0].text())}),playlist.addEventListener("clickChange",()=>{setPlaying(!0)}),playlist.addEventListener("playlistEnd",()=>{playlist.currentPlayer.pause(),setPlaying(!1)}),urlSelectLoad.addEventListener("click",async()=>{var e=urlSelect.value;queryImport||(params.set("url",e),updateHistory()),loadURL(e)}),fileSelect.addEventListener("change",async()=>{if(0!==fileSelect.files.length){const e=[];for(const t of fileSelect.files)e.push({name:t.name,buffer:await t.arrayBuffer()});loadSongs(e)}}),playbackButton.addEventListener("click",()=>{setPlaying("true"!==playbackButton.dataset.toggled)}),resetButton.addEventListener("click",()=>{playlist.currentPlayer?.reset(),setPlaying(!1)}),repeatButton.addEventListener("click",()=>{switch(repeatButton.dataset.status){case void 0:setRepeat(1);break;case"one":setRepeat(2);break;case"playlist":setRepeat(0)}}),progressBar.addEventListener("mousedown",()=>{playlist.currentPlayer.updateProgress=!1}),progressBar.addEventListener("mouseup",()=>{playlist.currentPlayer.currentTick=Math.round(progressBar.value/100*playlist.currentPlayer.lastTick),playlist.currentPlayer.updateProgress=!0}),loopingCheck.addEventListener("change",()=>playlist.currentPlayer.loop=loopingCheck.checked),parityCheck.addEventListener("change",()=>playlist.currentPlayer.useParity=parityCheck.checked),init()});