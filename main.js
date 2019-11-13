const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
require("electron-reload")(__dirname);

const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: "./database.sqlite"
  }
});
let mainWindow;

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

  ipcMain.on("mainWindowLoaded", function() {
    let result = knex.select("username").from("users");
    result.then(function(rows) {
      mainWindow.webContents.send("result", rows);
    });
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
