const electron = require('electron')
const moment = require('moment')
moment.locale('zh-cn');
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain

const path = require('path')
const url = require('url')
const log = require('electron-log');
const fs = require('fs');

//菜单
const Menu = electron.Menu
const template = [
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
      {role: 'pasteandmatchstyle'},
      {role: 'delete'},
      {role: 'selectall'}
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {role: 'toggledevtools'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  {
    role: 'window',
    submenu: [
      {role: 'minimize'},
      {role: 'close'}
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('https://electronjs.org') }
      }
    ]
  }
]
if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {role: 'services', submenu: []},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideothers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'}
    ]
  })

  // Edit menu
  template[1].submenu.push(
    {type: 'separator'},
    {
      label: 'Speech',
      submenu: [
        {role: 'startspeaking'},
        {role: 'stopspeaking'}
      ]
    }
  )

  // Window menu
  template[3].submenu = [
    {role: 'close'},
    {role: 'minimize'},
    {role: 'zoom'},
    {type: 'separator'},
    {role: 'front'}
  ]
}
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 800})

  // and load the index.html of the app. 
	const pkg = require('../package.json') // 引用package.json 
	//判断是否是开发模式 
	if(pkg.DEV) { 
	  mainWindow.loadURL("http://localhost:3000/")
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
	} else { 
	  mainWindow.loadURL(url.format({
      pathname:path.join(__dirname, '../build/index.html'), 
      protocol:'file:', 
      slashes:true 
	  }))
	}

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
const userData = app.getAppPath('userData').replace('app.asar', '');
// log.info(userData);
//升级，增加staff.db
fs.access(userData+'/db/staff.db', fs.constants.F_OK, (err) => {
  if(err){
    fs.writeFileSync(userData+'/db/staff.db', '');
  }
})
const db = {};
fs.readdir(userData+'/db/', (err, files) => {
  files = files.filter(v => v.match(/^.*\.db$/));
  files = files.map(v => v.match(/(.*)\./)[1])
  for (const file of files) {
    if(file.match(/^history_work/)){
      db['history_work'] = new Datastore({ filename: userData+'/db/'+file+'.db', autoload: true });
    }else{
      db[file] = new Datastore({ filename: userData+'/db/'+file+'.db', autoload: true });
    }
  }
});
//计件分年保存
const history_work_part = 'history_work_' + (new Date()).getFullYear();
fs.access(userData+'/db/'+history_work_part+'.db', fs.constants.F_OK, (err) => {
  if(err){
    fs.writeFileSync(userData+'/db/'+history_work_part+'.db', '');
    db['history_work'] = new Datastore({ filename: userData+'/db/'+history_work_part+'.db', autoload: true });
  }
})
/**
 * 每次启动自动备份数据
 */
var backupInfo = {time: null, count: 0};
fs.readdir(userData+'/db/', (err, files) => {
  files = files.filter(v => v.match(/^.*\.db$/));
  for (const file of files) {
    //空文件不备份
    if(fs.statSync(userData+'/db/'+file).size === 0){
      continue;
    }
    fs.copyFile(userData+'/db/'+file, userData+'/db/'+file+'.back', (err) => {if (err) throw err;});
  }
  backupInfo.time = moment().format('YYYY-MM-DD HH:mm:ss');
  backupInfo.count = files.length;
});

/* IPC's */
//order
ipcMain.on('c-order', function (event, arg) {
  //必须分开赋值，否则变浅拷贝
  let ord=JSON.parse(arg);
  arg=JSON.parse(arg);
  //去掉多余字段
  // delete ord.scrap_rate;
  db.order.insert(ord, function (err, newDoc) {
    if(!err){
      event.sender.send('c-order', {isSuccess:true})
    }
  });
  db.product.count({name: arg.product_name}, function(err,count){
    if(count==0){
      db.product.insert({name:arg.product_name, scrap_rate:arg.scrap_rate}, function(err,newDoc){})
    }else{
      db.product.update({name:arg.product_name}, {$set:{scrap_rate:arg.scrap_rate}}, {upsert:true}, function (err, numReplaced) {});
    }
  })
});

ipcMain.on('r-order', async function (event, arg) {
  let results=arg.results||10;
  let page=arg.page||1;
  let sortObj={};
  sortObj[arg.sortField||'date']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  let findObj={};
  if(!arg.product_name){
    arg.product_name='';
  }
  findObj.product_name={ $regex: new RegExp(arg.product_name,'i')}
  if(arg.item_name){
    findObj = await new Promise(function (resolve, reject) {
      db.bom.find({'item_name':arg.item_name}).exec(function(err, docs){
        let product_names=docs.map((doc)=>doc.product_name);
        findObj={product_name:{$in: product_names}};
        resolve(findObj);
      })
    })
  }
  db.order.count(findObj, function (err, count) {
    db.order.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      docs=docs.map(v=>{
        v.customer_name = v.customer_name ? v.customer_name : '';
        v.scrap_rate = v.scrap_rate ? v.scrap_rate : 0;
        v.note = v.note ? v.note : '';
        v.status = v.status ? v.status : '';
        return v;
      })
      event.sender.send('r-order', {
        list:docs, 
        total:count
      })
    });
  });
});

ipcMain.on('u-order', function (event, arg) {
  let ord=JSON.parse(arg);
  arg=JSON.parse(arg);
  //去掉多余字段
  // delete ord.scrap_rate;
  db.order.update({_id:arg._id}, ord, function (err, numReplaced) {
    if(!err){
      event.sender.send('u-order', {isSuccess:true})
    }
  });
  db.product.update({name:arg.product_name}, {$set:{scrap_rate:arg.scrap_rate}}, {upsert:true}, function(err, numReplaced) {});
});

ipcMain.on('d-order', function (event, arg) {
  db.order.remove({ _id: arg }, {}, function (err, numRemoved) {
    event.sender.send('d-order', numRemoved)
  });
});

//bom
ipcMain.on('r-bom', function (event, arg) {
  const {hasStock}=arg;//是否带出库存
  delete arg.hasStock;
  db.bom.find(arg).sort({item_name:1}).exec(function(err, docs){
    if(docs.length){
      let item_names=docs.map((item)=>item.item_name);
      db.item.find({name:{$in: item_names}}, function(err, item_docs){
        //连接bom表和item表
        let item={};
        for(let i in item_docs){
          item[item_docs[i]['name']]={desc:item_docs[i]['desc'], unit:item_docs[i]['unit'], cate:item_docs[i]['cate'], ceil:item_docs[i]['ceil']}
        }
        //将材料详情,索引添加到bom记录中
        for(let i in docs){
          Object.assign(docs[i], item[docs[i].item_name], {index:parseInt(i)+1})
        }
        if(hasStock){
          //连接stock表
          db.stock.find({item_name:{$in: item_names}}, function(err, item_docs){
            item={};
            for(let i in item_docs){
              item[item_docs[i]['item_name']]={stock_qty:item_docs[i]['qty']}
            }
            for(let i in docs){
              Object.assign(docs[i], item[docs[i].item_name])
            }
            event.sender.send('r-bom', docs)
          })
        }else{
          event.sender.send('r-bom', docs)
        }
      })
    }else{
      event.sender.send('r-bom', docs)
    }
  })
});

ipcMain.on('u-bom', function (event, arg) {
  //先清空
  db.bom.remove({product_name:arg.product_name},{multi:true},function (err, numRemoved) {
  });
  //再插入
  db.bom.insert(arg.list, function (err, newDoc) {
  })
});

ipcMain.on('d-bom', function (event, arg) {
   
});

//item
ipcMain.on('c-item', function (event, arg) {
  //用upsert代替了
});

ipcMain.on('r-item', function (event, arg) {
  arg=arg?arg:'.*';
  db.item.find({name:{ $regex: new RegExp(arg,'i')}}).limit(15).exec(function(err, docs){
    event.sender.send('r-item',docs)
  })
});

ipcMain.on('u-item', function (event, arg) {
  //name desc unit
  db.item.update({
      name:arg.item_name
    },{
      name: arg.item_name,
      desc: arg.desc,
      unit: arg.unit,
      cate: arg.cate
    },{
      upsert: true
    },function(err, numReplaced, upsert){
    }
  )
  //新增库存
  db.stock.count({item_name:arg.item_name}, function (err, count) {
    if(!count){
      const newStock={item_name:arg.item_name, qty:0, modified:moment().format()};
      db.stock.insert(newStock, function (err, newDoc) {})
      db.stockLog.insert({
        item_name:newStock.item_name,
        time:moment().format(),
        num:newStock.qty,
        type:'新增'
      })
    }
  })
});

//product
ipcMain.on('c-product', function (event, arg) {
  arg.name = arg.name ? arg.name : arg.product_name;
  delete arg.product_name;
  //必须分开赋值，否则变浅拷贝
  let product = JSON.parse(arg);
  arg = JSON.parse(arg);
  //查重
  db.product.count({name: arg.name}, function(err,count){
    if(count > 0){
      event.sender.send('c-product', {isSuccess:false, msg: '新增失败，该产品已存在'})
      return;
    }
    db.product.insert(product, function (err, newDoc) {
      if(!err){
        event.sender.send('c-product', {isSuccess:true})
      }
    });
  })
});

ipcMain.on('r-productAll', function (event, arg) {
  let sortObj={};
  if(arg.sortField){
    sortObj[arg.sortField]=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  }
  let findObj={};
  db.product.find(findObj).sort(sortObj).exec(function (err, docs) {
    docs=docs.map((v)=>{
      v.note = v.note ? v.note : '';
      v.procedure = v.procedure ? v.procedure : [];
      return v;
    })
    event.sender.send('r-productAll', {list:docs, total:docs.length})
  })
});

ipcMain.on('r-product', async function (event, arg) {
  let results=arg.results||15;
  let page=arg.page||1;
  let sortObj={};
  if(arg.sortField){
    sortObj[arg.sortField]=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  }
  let findObj={};
  if(arg.name){
    findObj.name = { $regex: new RegExp(arg.name,'i')}
  }
  if(arg._id){
    findObj._id = arg._id;
  }
  db.product.count(findObj, function (err, count) {
    db.product.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      docs=docs.map((v)=>{
        v.note = v.note ? v.note : '';
        v.procedure = v.procedure ? v.procedure : [];
        return v;
      })
      event.sender.send('r-product', {list:docs, total:count})
    })
  })
});

ipcMain.on('u-product', function (event, arg) {
  let data={note:arg.note, procedure:arg.procedure};
  db.product.update(
    {_id:arg._id}, 
    {$set:data}, 
    {upsert:true}, 
    function(err, numReplaced) {
      event.sender.send('u-product', {isSuccess: true})
    }
  );
});

ipcMain.on('d-product', function (event, arg) {
  db.product.remove({ _id: arg }, {}, function (err, numRemoved) {
    event.sender.send('d-product', numRemoved)
  });
});

ipcMain.on('c-history_work', function (event, arg) {
  delete arg.index;
  delete arg.isNewRecord;
  db.history_work.insert(arg, function (err, newDoc) {
    if(!err){
      event.sender.send('c-history_work', {isSuccess:true, newDoc: newDoc})
    }
  });
})

ipcMain.on('r-history_work', async function (event, arg) {
  let sortObj={ date: -1};
  if(arg.sortField){
    sortObj[arg.sortField]=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  }
  let findObj={};
  if(arg.staff_id){
    findObj.staff_id = arg.staff_id;
  }
  db.history_work.find(findObj).sort(sortObj).exec(function (err, docs) {
    if(!err){
      event.sender.send('r-history_work', docs)
    }
  })
});

ipcMain.on('u-history_work', function (event, arg) {
  delete arg.index;
  delete arg.isNewRecord;
  db.history_work.update(
    { _id: arg._id }, 
    { $set: arg }, 
    {}, 
    function (err) {
      if(!err){
        event.sender.send('u-history_work', {isSuccess:true})
      }
  });
})

ipcMain.on('d-history_work', function (event, arg) {
  db.history_work.remove({ _id: arg._id }, {}, function (err, numRemoved) {
    if(numRemoved){
      event.sender.send('d-history_work', {isSuccess:true})
    }
  });
})

//staff
ipcMain.on('c-staff', function (event, arg) {
  //必须分开赋值，否则变浅拷贝
  let staff = JSON.parse(arg);
  arg = JSON.parse(arg);
  staff.history_work = staff.history_work || [];
  //查重
  db.staff.count({name: arg.staff_name}, function(err,count){
    if(count > 0){
      event.sender.send('c-staff', {isSuccess:false, msg: '新增失败，该名字已存在'})
      return;
    }
    db.staff.insert(staff, function (err, newDoc) {
      if(!err){
        event.sender.send('c-staff', {isSuccess:true})
      }
    });
  })
});

ipcMain.on('r-staff', async function (event, arg) {
  let results=arg.results||15;
  let page=arg.page||1;
  let sortObj={};
  if(arg.sortField){
    sortObj[arg.sortField]=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  }
  let findObj={};
  if(arg.staff_name){
    findObj.staff_name={ $regex: new RegExp(arg.staff_name,'i')}
  }
  if(arg._id){
    findObj._id = arg._id;
  }
  db.staff.count(findObj, function (err, count) {
    db.staff.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      event.sender.send('r-staff', {list:docs, total:count})
    })
  })
});

ipcMain.on('u-staff', function (event, arg) {
  let data={};
  if(arg.product_name) data.product_name = arg.product_name;
  if(arg.procedure_name) data.procedure_name = arg.procedure_name;
  if(arg.note) data.note = arg.note;
  db.staff.update(
    {_id:arg._id},
    {$set:data},
    {upsert:true},
    function(err, numReplaced) {
      event.sender.send('u-staff', {isSuccess: true})
    }
  );
});

ipcMain.on('d-staff', function (event, arg) {
  db.staff.remove({ _id: arg }, {}, function (err, numRemoved) {
    event.sender.send('d-staff', numRemoved)
  });
});

/**
 * 读取全部库存，用于导出
 */
ipcMain.on('r-stockAll', function (event, arg) {
  let sortObj={};
  let sortField=arg.sortField||'modified';
  let sortOrder=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  sortObj[sortField]=sortOrder;
  let findObj={};
  findObj.item_name={ $regex: new RegExp(arg.item_name||'','i')}
  
  db.stock.find(findObj, function (err, docs) {
    docs.sort((a,b)=>(a[sortField]>b[sortField]?1:-1)*sortOrder)
    if(docs.length){
      let item_names=docs.map((item)=>item.item_name);
      findObj={name:{$in: item_names}};
      db.item.find(findObj, function(err, item_docs){
        let count=0;
        //连接stock表和item表
        let item={};
        for(let i in item_docs){
          item[item_docs[i]['name']]={
            desc:item_docs[i]['desc'], 
            unit:item_docs[i]['unit'],
            cate:item_docs[i]['cate'],
            ceil:item_docs[i]['ceil'],
          }
        }
        //将材料详情,索引添加到bom记录中
        for(let i in docs){
          Object.assign(docs[i], item[docs[i].item_name])
        }
        if(arg.cate && arg.cate.length){
          docs=docs.filter((v,i)=>arg.cate.findIndex(e=>e===v.cate)!==-1)
        }
        count=docs.length
        docs=docs.map(v=>{
          v.desc = v.desc ? v.desc : '';
          v.unit = v.unit ? v.unit : '';
          v.cate = v.cate ? v.cate : '';
          v.ceil = v.ceil ? v.ceil : false;
          return v;
        })
        event.sender.send('r-stockAll', {
          list:docs, 
          total:count
        })
      })
    }else{
      event.sender.send('r-stockAll', {
        list:[], 
        total:0
      })
    }
  });
});

/**
 * stock
 * 预计调整方向：stock并入item表，方便筛选排序操作
 */
ipcMain.on('r-stock', function (event, arg) {
  let results=arg.results||15;
  let page=arg.page||1;
  let sortObj={};
  let sortField=arg.sortField||'modified';
  let sortOrder=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  sortObj[sortField]=sortOrder;
  let findObj={};
  findObj.item_name={ $regex: new RegExp(arg.item_name||'','i')}
  
  db.stock.find(findObj, function (err, docs) {
    docs.sort((a,b)=>(a[sortField]>b[sortField]?1:-1)*sortOrder)
    // db.stock.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      if(docs.length){
        let item_names=docs.map((item)=>item.item_name);
        findObj={name:{$in: item_names}};
        db.item.find(findObj, function(err, item_docs){
          let count=0;
          //连接stock表和item表
          let item={};
          for(let i in item_docs){
            item[item_docs[i]['name']]={
              desc:item_docs[i]['desc'], 
              unit:item_docs[i]['unit'],
              cate:item_docs[i]['cate'],
              ceil:item_docs[i]['ceil'],
            }
          }
          //将材料详情,索引添加到bom记录中
          for(let i in docs){
            Object.assign(docs[i], item[docs[i].item_name])
          }
          if(arg.cate && arg.cate.length){
            docs=docs.filter((v,i)=>arg.cate.findIndex(e=>e===v.cate)!==-1)
          }
          count=docs.length
          docs=docs.splice((page-1)*results, results)
          docs=docs.map(v=>{
            v.desc = v.desc ? v.desc : '';
            v.unit = v.unit ? v.unit : '';
            v.cate = v.cate ? v.cate : '';
            v.ceil = v.ceil ? v.ceil : false;
            return v;
          })
          event.sender.send('r-stock', {
            list:docs, 
            total:count
          })
        })
      }else{
        event.sender.send('r-stock', {
          list:[], 
          total:0
        })
      }
    // });
  });
});

//递归批量更新库存
function updateStock(arg={type:'', desc:'', data:[]}, callback){
  arg.data=arg.data.filter(r=>r.diff!==0);
  if(!arg.data.length){
    return callback({isSuccess:true});
  }else{
    const row=arg.data[arg.data.length-1];//取最后一行
    if(row.diff!==0){
      let item_name=row.item_name.value?row.item_name.value:row.item_name;
      db.stock.update(
        {item_name: item_name},
        {
          // $inc:{qty: parseFloat(row.diff).toFixed(3)},
          $set:{item_name: item_name, qty:(parseFloat(row.diff)+parseFloat(row.stock_qty)).toFixed(3), modified:moment().format()}
        }, 
        {upsert:true},
        function(err, num){
          if(!err){
            db.stockLog.insert({
              item_name:item_name,
              time:moment().format(),
              num:parseFloat(row.diff),
              type:arg.type,
              desc:arg.desc
            })
            arg.data.pop();//用完一条删除一条
            if(arg.data.length){
              return updateStock(arg, callback);
            }else{
              //更新完毕
              return callback({isSuccess:true});
            }
          }else{
            return callback({isSuccess:false, msg:err})
          }
        }
      )
    }
  }
}

ipcMain.on('u-stock', function (event, arg={type:'', desc:'', data:[]}) {
  //data:[{item_name:xxx, diff:233},...]
  arg=JSON.parse(arg);
  updateStock(arg, function(result){ 
    event.sender.send('u-stock', result); 
  });
})

ipcMain.on('d-stock', function (event, arg) {
  db.stock.remove({_id:arg}, {}, function (err, numRemoved) {
    // db.item.remove({name:arg}, {}, function (err, numRemoved) {
      // db.bom.remove({item_name:arg}, {}, function (err, numRemoved) {})
    // })
  })
})

//itemStock 合并处理物品(item)、库存(stock)
ipcMain.on('c-itemStock', function (event, arg){
  arg=JSON.parse(arg);
  arg.name=arg.item_name;
  delete arg.item_name;
  const newStock={item_name:arg.name, qty:arg.qty, modified:moment().format()};
  delete arg.qty;
  db.item.update({name:arg.name}, arg, {upsert: true}, function(err, numReplaced, upsert){
    if(!err){
      db.stock.count({item_name: newStock.item_name}, function(err, count) {
        if(count){
          event.sender.send('c-itemStock', {isSuccess:false, msg:'已存在该商品的库存记录！'})
        }else{
          db.stock.insert(newStock, function (err, newDoc) {
            event.sender.send('c-itemStock', {isSuccess:true})
          })
          db.stockLog.insert({
            item_name:newStock.item_name,
            time:moment().format(),
            num:newStock.qty,
            type:'新增'
          })
        }
      })
    }
  });
});

ipcMain.on('u-itemStock', function (event, arg){
  arg=JSON.parse(arg);
  arg.name=arg.item_name;
  const newStock={item_name:arg.name, qty:(parseFloat(arg.qty)+parseFloat(arg.diff)).toFixed(3), modified:moment().format()};
  delete arg.item_name;
  delete arg.qty;
  delete arg._id;
  delete arg.index;
  delete arg.log;
  delete arg.diff;
  db.item.update({name:arg.name}, arg, function (err, numReplaced) {
    if(!err){
      db.stock.update({item_name:newStock.item_name}, newStock, function (err, numReplaced) {
        if(numReplaced){
          event.sender.send('u-itemStock', {isSuccess:true, newStock: newStock})
        }
      })
    }
  });
});

//库存日志
ipcMain.on('c-stockLog', function (event, qtyLog){
  db.stockLog.insert({
    item_name: qtyLog.item_name, 
    time: moment().format(),
    num: (qtyLog.num && parseFloat(qtyLog.num.toFixed(3)))||'',
    type: qtyLog.type
  });
})

ipcMain.on('r-stockLog', function (event, arg){
  let results=arg.results||10;
  let page=arg.page||1;
  let sortObj={};
  sortObj[arg.sortField||'time']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  let findObj={};
  if(!arg.item_name){
    arg.item_name='';
  }
  findObj.item_name={ $regex: new RegExp(arg.item_name,'i')}

  db.stockLog.count(findObj, function (err, count) {
    db.stockLog.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      event.sender.send('r-stockLog', {list:docs, total:count})
    })
  })
})

//stockReport
ipcMain.on('c-stockReport', function (event, arg){
  let stockReport=[];
  //上期库存
  db.stockReport.findOne().sort({time:-1}).exec(function(err, prevReport){
    let isFirstReport=false;
    let report=[];
    const prevStock={};
    if(!err && !prevReport){
      //数据库为空,建立期初报表
      isFirstReport=true;
    }else{
      report=prevReport.report;
      //建立item_name索引
      for(let row of report){
        prevStock[row.item_name]=row;
      }
    }
    //本期库存
    db.stock.find({}, {_id:0}, function(err, stocks){
      let from='', to=moment().format();
      from = isFirstReport ? moment("1980-01-01").format() : prevReport.time;
      //根据库存日志统计入库、领料数
      db.stockLog.find({time:{$gte:from, $lt:to}}, function(err, logs){
        const itemsInout={};
        for(let log of logs){
          if(!itemsInout[log.item_name])
            itemsInout[log.item_name]={in:0, out:0};
          if(log.num>0)
            itemsInout[log.item_name].in+=log.num
          else if(log.num<0)
            itemsInout[log.item_name].out+=log.num
        }
        //附加字段
        stockReport=stocks.map(stock=>{
          const prevQty = prevStock[stock.item_name]?prevStock[stock.item_name].qty:0;
          const stockIn = itemsInout[stock.item_name]?itemsInout[stock.item_name].in:0;
          const stockOut = itemsInout[stock.item_name]?itemsInout[stock.item_name].out:0;
          delete stock.modified;
          if(prevStock[stock.item_name]){
            delete prevStock[stock.item_name];//删除已使用的上期物品
          }
          return Object.assign(stock, {
            prevQty: parseFloat(prevQty),
            in: parseFloat(stockIn.toFixed(3)),
            out: parseFloat(stockOut.toFixed(3)),
            qty: parseFloat(stock.qty)
          })
        })
        //剩下的是上期存在，但在本期被删除库存的物品，需要合并到报表里
        let prevKeys=Object.keys(prevStock);
        if(prevKeys.length){
          for(let key of prevKeys){
            let row=prevStock[key];
            Object.assign(row, {
              prevQty: row.qty, 
              in: itemsInout[prevStock.item_name]?itemsInout[prevStock.item_name].in:0,
              out: itemsInout[prevStock.item_name]?itemsInout[prevStock.item_name].out:0,
              qty: 0
            })
            stockReport.push(row);
          }
        }
        db.stockReport.insert({
          time:moment().format(),
          report: stockReport,
        }, function(err, newDoc){
          const result=err?{isSuccess:false, msg:err}:{isSuccess:true};
          event.sender.send('c-stockReport', result)
        })
      })
    })
  })
})

ipcMain.on('r-stockReport', function (event, arg){
  let findObj={};
  if(arg._id){
    //详情
    findObj._id=arg._id;
    db.stockReport.findOne(findObj).exec(function (err, doc) {
      let {report}=doc;
      const item_names=[];
      for(let row of report){
        item_names.push(row.item_name);
      }
      db.item.find({name:{$in: item_names}}, {_id:-1}, function(err,items){
        const itemsIndex={};
        for(let item of items){
          itemsIndex[item.name]=item;
        }
        report=report.map(row=>Object.assign(row, itemsIndex[row.item_name]));
        event.sender.send('r-stockReport', doc)
      })
    })
  }else{
    //列表
    let results=arg.results||10;
    let page=arg.page||1;
    let sortObj={};
    sortObj[arg.sortField||'time']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
    db.stockReport.count({}, function (err, count) {
      db.stockReport.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
        for(let i in docs){
          docs[i].index=parseInt(i)+1;
        }
        event.sender.send('r-stockReport', {list:docs, total:count})
      })
    })
  }
})

ipcMain.on('d-stockReport', function(event, _id){
  db.stockReport.remove({_id}, {}, function(err, numRemoved){
  })
})

ipcMain.on('importStockFromItem', function(event, _id){
  db.item.find({},{name:1, _id:0}).exec(function(err,docs){
    let a=docs.map((v,i)=>v.name)
    db.stock.find({},{item_name:1, _id:0}).exec(function(err,docs){
      let b=new Set(docs.map(v=>v.item_name))
      // ab差集
      let differenceAB = a.filter(x => !b.has(x));
      if(differenceAB.length){
        let modified = moment().format();
        differenceAB = differenceAB.map(v=>{return {item_name:v, qty:0, modified:modified}})
        db.stock.insert(differenceAB, function (err, newDoc) {})
      }
    })
  })
})

ipcMain.on('backupInfo', function(event, arg){
  event.sender.send('backupInfo', backupInfo)
})

ipcMain.on('recover', function(event, arg){
  fs.readdir(userData+'/db/', (err, files) => {
    files = files.filter(v => v.match(/^.*\.db$/));
    for (const file of files) {
      fs.copyFileSync(userData+'/db/'+file+'.back', userData+'/db/'+file, (err) => {if (err) throw err;});
    }
    event.sender.send('recover', {isSuccess: true});
  });
})

//百度文字识别
var AipOcrClient = require("baidu-aip-sdk").ocr;
// 设置APPID/AK/SK
var APP_ID = "14996021";
var API_KEY = "BG5pHqabOgGBuooKdUubVShs";
var SECRET_KEY = "vr0Y1qPILCPXbukHTgrpZFjr5yzIb0to";

// 新建一个对象，建议只保存一个对象调用服务接口
var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
var HttpClient = require("baidu-aip-sdk").HttpClient;

// 设置request库的一些参数，例如代理服务地址，超时时间等
// request参数请参考 https://github.com/request/request#requestoptions-callback
HttpClient.setRequestOptions({timeout: 5000});

// 也可以设置拦截每次请求（设置拦截后，调用的setRequestOptions设置的参数将不生效）,
// 可以按需修改request参数（无论是否修改，必须返回函数调用参数）
// request参数请参考 https://github.com/request/request#requestoptions-callback
HttpClient.setRequestInterceptor(function(requestOptions) {
    // 查看参数
    console.log(requestOptions)
    // 修改参数
    requestOptions.timeout = 5000;
    // 返回参数
    return requestOptions;
});

ipcMain.on('ocr', function (event, arg={filepath:'', type:1}){
  // 图片文件base64编码
  var fs = require('fs');
  var base64 = new Buffer(fs.readFileSync(arg.filepath)).toString('base64');
  
  if(arg.type===1){
    // 以json格式获取表格识别结果，10秒的超时限制
    client.tableRecorgnize(base64, {result_type: 'json'}, 15000).then(function(result) {
      event.sender.send('ocr', result);
    }).catch(function(e){
      event.sender.send('ocr', e);
    });
    
    // 调用表格识别结果
    // client.tableGetresult("14996021_748495", {result_type: 'json'}).then(function(result) {
      //   event.sender.send('ocr', result);
    // }).catch(function(err) {
      //   event.sender.send('ocr', e);
    // });
  }
  if(arg.type===2){
    // 调用通用文字识别（高精度版）
    client.accurateBasic(base64).then(function(result) {
      event.sender.send('ocr', result);
    }).catch(function(e) {
      event.sender.send('ocr', e);
    });
  }
})

// let env = app.get('env')
// env = process.env.NODE_ENV