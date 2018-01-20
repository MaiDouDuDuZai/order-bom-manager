const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app. 
	const pkg = require('./package.json') // 引用package.json 
	//判断是否是开发模式 
	if(pkg.DEV) { 
	  mainWindow.loadURL("http://localhost:3000/")
	} else { 
	  mainWindow.loadURL(url.format({
		pathname:path.join(__dirname, './build/index.html'), 
		protocol:'file:', 
		slashes:true 
	  }))
	}

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const Datastore = require('nedb');
const userData = app.getAppPath('userData').replace('/app.asar', '');
const db={
  order: new Datastore({ filename: userData+'/db/order.db', autoload: true }),
  bom: new Datastore({ filename: userData+'/db/bom.db', autoload: true }),
  material: new Datastore({ filename: userData+'/db/material.db', autoload: true }),
  product: new Datastore({ filename: userData+'/db/product.db', autoload: true })
};
/* IPC's */
ipcMain.on('c-order', function (event, arg) {
  db.order.insert(JSON.parse(arg), function (err, newDoc) {});
});
ipcMain.on('r-order', function (event, arg) {
  let results=arg.results||10;
  let page=arg.page||1;
  let sortObj={};
  sortObj[arg.sortField||'_id']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||1;
  let findObj={};
  if(arg.product_name){
    findObj.product_name={ $regex: new RegExp(arg.product_name,'i')}
  }
  
  db.order.count({}, function (err, count) {
    db.order.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      event.sender.send('r-order', {
        list:docs, 
        total:count
      })
    });
  });
});
ipcMain.on('u-order', function (event, arg) {
   
});
ipcMain.on('d-order', function (event, arg) {
   
});
ipcMain.on('r-bom', function (event, arg) {
   
});
ipcMain.on('d-bom', function (event, arg) {
   
});
ipcMain.on('r-material', function (event, arg) {
   
});
ipcMain.on('r-product', function (event, arg) {
   
});