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
   if(arg!=''){

   }
   db.order.find({}, function (err, docs) {
     ipcMain.send('r-order',docs)
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
/*
db.product.insert({ 
  name: '023-007-0240',
  name: 'PC5R6-28V4'
}, function (err, newDoc) {});
db.material.insert([{ 
    name: 'W-3000-0531',
    desc: 'Hardener',
    unit:'kg'
  },{
    name:'A-1201-0094',
    desc:'BRN-RED',
    unit:'st'
  }
], function (err, newDoc) {});
db.bom.insert([{
    product_name:'023-007-0240',
    material_name:'W-3000-0531',
    qty:1
  },{
    product_name:'023-007-0240',
    material_name:'A-1201-0094',
    qty:2
  },{
    product_name:'PC5R6-28V4',
    material_name:'A-1201-0094',
    qty:66
}], function (err, newDoc) {})
db.order.insert([{
    product_name:'023-007-0240',
    qty:500,
    date:'2018-01-01',
    note:'2333'
  },{
    product_name:'023-007-0240',
    qty:200,
    date:'2018-04-04',
    note:'666'
  },{
    product_name:'PC5R6-28V4',
    qty:1000,
    date:'2018-06-01',
    note:''
}], function (err, newDoc) {})
*/