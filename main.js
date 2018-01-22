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
//order
ipcMain.on('c-order', function (event, arg) {
  arg=JSON.parse(arg);
  db.order.insert(arg, function (err, newDoc) {
    if(!err){
      event.sender.send('c-order', {isSuccess:true})
    }
  });
  db.product.count({name: arg.product_name}, function(err,count){
    if(count==0){
      db.product.insert({name:arg.product_name}, function(err,newDoc){
      })
    }
  })
});

ipcMain.on('r-order', function (event, arg) {
  let results=arg.results||10;
  let page=arg.page||1;
  let sortObj={};
  sortObj[arg.sortField||'_id']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||1;
  let findObj={};
  if(!arg.product_name){
    arg.product_name='';
  }
  findObj.product_name={ $regex: new RegExp(arg.product_name,'i')}
  
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
  console.log(arg)
  db.order.remove({ _id: arg }, {}, function (err, numRemoved) {
    event.sender.send('d-order', numRemoved)
  });
});

//bom
ipcMain.on('r-bom', function (event, arg) {
   db.bom.find(arg, function(err, docs){
      if(docs.length){
        let material_names=docs.map((item)=>item.material_name);
        db.material.find({name:{$in: material_names}}, function(err, material_docs){
          let material={};
          for(let i in material_docs){
            material[material_docs[i]['name']]={desc:material_docs[i]['desc'], unit:material_docs[i]['unit']}
          }
          for(let i in docs){
            Object.assign(docs[i], material[docs[i].material_name], {index:parseInt(i)+1})
          }
          event.sender.send('r-bom', docs)
        })
      }else{
        event.sender.send('r-bom', docs)
      }
   })
});

ipcMain.on('u-bom', function (event, arg) {
   
});

ipcMain.on('d-bom', function (event, arg) {
   
});

//material
ipcMain.on('c-material', function (event, arg) {
   //name desc unit
   db.material.insert({
     name: arg.material_name,
     desc: arg.desc,
     unit: arg.unit
   } , function(err, newDoc){})
});

ipcMain.on('r-material', function (event, arg) {
   
});

//product
ipcMain.on('r-product', function (event, arg) {
  if(!arg){
    arg='.*'
  }
  db.product.find({name:{$regex: new RegExp(arg,'i')}}, {name:1}).limit(15).exec(function (err, docs) {
    docs=docs.map((item)=>item.name)
    event.sender.send('r-product', docs)
  })
});