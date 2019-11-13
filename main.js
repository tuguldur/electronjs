const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const prompt = require("electron-prompt");
const path = require("path");
const url = require("url");
require("electron-reload")(__dirname);
var username = false;
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: "./database.sqlite"
  },
  useNullAsDefault: true
});
var mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/login.html"),
      protocol: "file",
      slashes: true
    })
  );
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  ipcMain.on("loggedin", (event, arg) => {
    username = arg;
  });
  ipcMain.on("login", (event, arg) => {
    let result = knex("users")
      .where(function() {
        this.where("username", "=", arg.username);
      })
      .andWhere(function() {
        this.where("password", "=", arg.password);
      })
      .limit(1);
    result.then(function(rows) {
      mainWindow.webContents.send("done", rows);
    });
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function() {
  if (mainWindow === null) createWindow();
});
const isMac = process.platform === "darwin";

const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [isMac ? { role: "close" } : { role: "quit" }]
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }]
            }
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forcereload" },
      { role: "toggledevtools" },
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" }
          ]
        : [{ role: "close" }])
    ]
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://electronjs.org");
        }
      }
    ]
  },
  {
    label: "Settings",
    submenu: [
      {
        label: "Нууц үг солих",
        click: async () => {
          mainWindow.webContents
            .executeJavaScript('localStorage.getItem("auth");', true)
            .then(result => {
              username = result;
            });
          username
            ? prompt({
                title: "Нууц үг солих",
                label: "Солих нууц үгээ оруулна уу:",
                value: "",
                inputAttrs: {
                  type: "password"
                },
                type: "input"
              })
                .then(password => {
                  if (password === null) {
                    console.log("user cancelled");
                  } else {
                    knex("users")
                      .update({
                        password
                      })
                      .where({ username, username })
                      .then(e => {
                        console.log(e);
                      })
                      .catch(function(err) {
                        console.log(err.stack);
                      });
                  }
                })
                .catch(console.error)
            : console.log("not logged in");
        }
      },
      {
        label: "Системээс гарах",
        click: async () => {
          username = false;
          mainWindow.webContents
            .executeJavaScript('localStorage.removeItem("auth");', true)
            .then(() => {
              mainWindow.webContents.executeJavaScript(
                'window.location.replace("./login.html");',
                true
              );
            });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
