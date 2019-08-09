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
    mainWindow.webContents.openDevTools()
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
const userData = app.getAppPath('exe').replace(/app.asar/, '');
log.info(userData);
const db={
  order: new Datastore({ filename: userData+'/db/order.db', autoload: true }),
  bom: new Datastore({ filename: userData+'/db/bom.db', autoload: true }),
  item: new Datastore({ filename: userData+'/db/item.db', autoload: true }),
  product: new Datastore({ filename: userData+'/db/product.db', autoload: true }),
  stock: new Datastore({ filename: userData+'/db/stock.db', autoload: true }),
  stockLog: new Datastore({ filename: userData+'/db/stockLog.db', autoload: true }),
  stockReport: new Datastore({ filename: userData+'/db/stockReport.db', autoload: true }),
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
  sortObj[arg.sortField||'date']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  let findObj={};
  if(!arg.product_name){
    arg.product_name='';
  }
  findObj.product_name={ $regex: new RegExp(arg.product_name,'i')}
  
  db.order.count(findObj, function (err, count) {
    db.order.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      docs=docs.map(v=>{
        v.customer_name = v.customer_name ? v.customer_name : '';
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
  arg=JSON.parse(arg);
  db.order.update({_id:arg._id}, arg, function (err, numReplaced) {
    if(!err){
      event.sender.send('u-order', {isSuccess:true})
    }
  });
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
          item[item_docs[i]['name']]={desc:item_docs[i]['desc'], unit:item_docs[i]['unit'], cate:item_docs[i]['cate']}
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
    })
});

//product
ipcMain.on('r-product', function (event, arg) {
  if(!arg){
    arg='.*'
  }
  arg=arg.replace(/[\[\]]/g,'');
  db.product.find({name:{$regex: new RegExp(arg,'i')}}, {name:1}).limit(15).exec(function (err, docs) {
    docs=docs.map((item)=>item.name)
    event.sender.send('r-product', docs)
  })
});

//stock
ipcMain.on('r-stock', function (event, arg) {
  let results=arg.results||10;
  let page=arg.page||1;
  let sortObj={};
  sortObj[arg.sortField||'modified']=(arg.sortOrder&&{descend:-1, ascend:1}[arg.sortOrder])||-1;
  let findObj={};
  if(!arg.item_name){
    arg.item_name='';
  }
  findObj.item_name={ $regex: new RegExp(arg.item_name,'i')}
  
  db.stock.count(findObj, function (err, count) {
    db.stock.find(findObj).sort(sortObj).skip((page-1)*results).limit(results).exec(function (err, docs) {
      docs=docs.map(v=>{
        v.desc = v.desc ? v.desc : '';
        v.unit = v.unit ? v.unit : '';
        v.cate = v.cate ? v.cate : '';
        return v;
      })
      if(docs.length){
        let item_names=docs.map((item)=>item.item_name);
        db.item.find({name:{$in: item_names}}, function(err, item_docs){
          //连接stock表和item表
          let item={};
          for(let i in item_docs){
            item[item_docs[i]['name']]={
              desc:item_docs[i]['desc'], 
              unit:item_docs[i]['unit'],
              cate:item_docs[i]['cate'],
            }
          }
          //将材料详情,索引添加到bom记录中
          for(let i in docs){
            Object.assign(docs[i], item[docs[i].item_name])
          }
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
    });
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
      db.stock.update(
        {item_name: row.item_name},
        {
          $inc:{qty: parseFloat(row.diff)},
          $set:{item_name: row.item_name, modified:moment().format()}
        }, 
        {upsert:true},
        function(err, num){
          if(!err){
            db.stockLog.insert({
              item_name:row.item_name,
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
  const newStock={item_name:arg.name, qty:parseFloat(arg.qty), modified:moment().format()};
  delete arg.item_name;
  delete arg.qty;
  delete arg._id;
  delete arg.index;
  delete arg.log;
  db.item.update({name:arg.name}, arg, function (err, numReplaced) {
    if(!err){
      db.stock.update({item_name:newStock.item_name}, newStock, function (err, numReplaced) {
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
          if(/入库/.test(log.type))
            itemsInout[log.item_name].in+=log.num
          else if(/领料/.test(log.type))
            itemsInout[log.item_name].out+=log.num
        }
        //附加字段
        stockReport=stocks.map(stock=>{
          const prevQty = prevStock[stock.item_name]?prevStock[stock.item_name].qty:0;
          const stockIn = itemsInout[stock.item_name]?itemsInout[stock.item_name].in:0;
          const stockOut = itemsInout[stock.item_name]?itemsInout[stock.item_name].out:0;
          if(prevStock[stock.item_name]){
            delete prevStock[stock.item_name];//删除已使用的上期物品
          }
          return Object.assign(stock, {
            prevQty,
            in: stockIn,
            out: stockOut
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