const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const prompt = require("electron-prompt");
const path = require("path");
const url = require("url");
var username = false;
var customer = false;
var search_users;
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
    width: 1350,
    height: 600,
    minHeight: 600,
    minWidth: 1350,
    backgroundColor: "#202124",
    devTools: false,
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
  ipcMain.on("add_user", (event, arg) => {
    console.log(arg);
    let result = knex("customers").insert(arg);

    result.then(function(rows) {
      let id = rows[0];
      let start = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, ".");
      let temp = new Date(start);
      let month = temp.setMonth(temp.getMonth() + 1);
      let end = new Date(month)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, ".");
      let data = { user_id: id, start, end, amount: 0, status: 1 };
      console.log(data);
      knex("loans")
        .insert(data)
        .then(function(rows) {
          console.log(rows);
        });
    });
  });
  ipcMain.on("add_loan", (event, arg) => {
    let result = knex("loans").insert(arg.loan);
    result.then(function(rows) {
      console.log(rows);
    });
  });
  ipcMain.on("get_user_loan", (event, arg) => {
    let result = knex("loans")
      .select("*")
      .where("user_id", "=", arg);
    result.then(function(rows) {
      mainWindow.webContents.send("users_loans", rows);
      console.log(rows);
    });
  });
  ipcMain.on("get_loan", (event, arg) => {
    let result = knex("customers")
      .orderBy("id", "asc")
      .leftJoin("loans", "customers.id", "=", "loans.user_id");
    result.then(function(rows) {
      var data = rows.filter(row => row.amount != null);
      mainWindow.webContents.send("loans", data);
    });
  });
  ipcMain.on("get_user", (event, arg) => {
    let result = knex("customers").orderBy("firstname", "asc");
    result.then(function(rows) {
      mainWindow.webContents.send("users", rows);
    });
  });
  ipcMain.on("info", (event, arg) => {
    let result = knex("customers").leftJoin(
      "loans",
      "customers.id",
      "=",
      "loans.user_id"
    );
    result.then(function(rows) {
      mainWindow.loadURL(
        url.format({
          pathname: path.join(__dirname, "pages/info.html"),
          protocol: "file",
          slashes: true
        })
      );
      var user = rows.find(e => e.id == arg);
      console.log(rows);
      customer = user;
    });
  });
  ipcMain.on("update", (event, arg) => {
    var { id, user } = arg;
    console.log(id);
    var result = knex("customers")
      .update({
        firstname: user.firstname,
        lastname: user.lastname,
        address: user.address,
        phone: user.phone
      })
      .where({ id });
    result.then(function(rows) {
      console.log(rows);
    });
  });
  ipcMain.on("update_loan", (event, arg) => {
    var { user_id, id, loan } = arg;
    console.log("user_id: ", user_id, " user_info", arg.info);
    var result = knex("loans")
      .update({
        amount: loan.amount,
        start: loan.start,
        end: loan.end,
        status: loan.status
      })
      .where({ id });
    var update_user = knex("customers")
      .update({ info: loan.info })
      .where({ id: user_id });
    update_user.then(function(rows) {
      console.log(rows);
    });
    result.then(function(rows) {
      console.log(rows);
    });
  });
  ipcMain.on("remove", (event, arg) => {
    var result = knex("customers")
      .where({ id: arg.id })
      .del();
    var loan = knex("loans")
      .where({ user_id: arg.id })
      .del();
    loan.then(function(rows) {
      console.log(rows);
    });
    result.then(function(rows) {
      console.log(rows);
    });
  });
  ipcMain.on("remove_loan", (event, arg) => {
    var result = knex("loans")
      .where({ id: arg.id })
      .del();
    result.then(function(rows) {
      console.log(rows);
    });
  });
  ipcMain.on("get_customer", (event, arg) => {
    mainWindow.webContents.send("info_customer", customer);
  });
  ipcMain.on("search_users", (event, arg) => {
    var result = knex("customers")
      .where("firstname", "like", `%${arg}%`)
      .orWhere("lastname", "like", `%${arg}%`)
      .orWhere("phone", "like", `%${arg}%`);
    result.then(function(rows) {
      if (rows.length !== 0) {
        mainWindow.loadURL(
          url.format({
            pathname: path.join(__dirname, "pages/search.html"),
            protocol: "file",
            slashes: true
          })
        );
        search_users = rows;
      } else {
        mainWindow.webContents.send("error", "Хэрэглэгч олдсонгүй");
      }
    });
  });
  ipcMain.on("get_search_users", (event, arg) => {
    console.log(search_users);
    mainWindow.webContents.send("search_result", search_users);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
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
      // { role: "toggledevtools" },
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
        label: "Messenger-ээр холбогдох",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://m.me/tuguldur");
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
