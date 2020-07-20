import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, InputNumber, Button, Table, AutoComplete, Popconfirm, Upload, message, Row, Col, Popover } from 'antd';
import ocr_example from '../ocr_example.jpg';
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

const EditableCell = ({ editable, value, column, onChange, autoCompleteData, record, onPressEnter }) => (
  <div>
    {editable
      ? (
          column==='item_name' ?
            <FormItem
              validateStatus={record.item_name.vaildate.length?'error':'success'} 
              help={
                record.item_name.vaildate.length?
                {empty:'不能为空',dulplicate:'材料重复'}[record.item_name.vaildate[0]]
                :''
              }
            >
              <AutoComplete 
                style={{ margin: '-5px 0' }}
                value={value} 
                onChange={v => onChange(v)}
                dataSource={autoCompleteData}
                allowClear={true}
              />
            </FormItem>
          : <Input 
              style={{ margin: '-5px 0' }} 
              value={value} 
              onChange={e => onChange(e.target.value)} 
              onPressEnter={e=>onPressEnter(e)}
            />
        )
      : value
    }
  </div>
);

class BomList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteData:[],
      ocrLoading: false,
      columns: [{
        title: '#',
        dataIndex: 'index',
        key: 'index',
        width:'2.5em',
      }, {
        title: '材料',
        dataIndex: 'item_name.value',
        key: 'item_name.value',
        width:'18%',
        render: (text, record) => this.renderColumns(text, record, 'item_name'),
        className: 'item-name'
      }, {
        title: '描述',
        dataIndex: 'desc',
        key: 'desc',
        render: (text, record) => this.renderColumns(text, record, 'desc'),
      }, {
        title: '单位用量',
        dataIndex: 'qty',
        key: 'qty',
        width:'12%',
        render: (text, record) => this.renderColumns(text, record, 'qty'),
      }, {
        title: '总用量',
        dataIndex: 'total_qty',
        width:'12%',
        key: 'total_qty',
        render:(text, record) => {
          return (<span style={{color:'#1890ff'}}>{this.getTotalQty(record)}</span>)
        }
      }, {
        title: '库存',
        dataIndex: 'stock_qty',
        width:'10%',
        key: 'stock_qty',
      }, {
        title: '出入库',
        dataIndex: 'diff',
        width:'8%',
        key: 'diff',
        render: (text, record) => <InputNumber 
          style={{ margin: '-5px 0' }} 
          value={text}
          onChange={value => this.handleChange(value, record._id, 'diff')}
        />
      }, {
        title: '单位',
        dataIndex: 'unit',
        width:'8%',
        key: 'unit',
        render: (text, record) => this.renderColumns(text, record, 'unit'),
      }, {
        title: '操作',
        key: 'action',
        width:'10%',
        render: (text, record) => {
          const { editable } = record;
          return (
            <div className="editable-row-operations">
              {
                editable ?
                  <span>
                    <Button type='link' style={{padding:0}} onClick={() => this.save(record._id)} disabled={record.item_name.vaildate.length}>保存</Button>&nbsp;
                    {
                      record.isNewRecord===true || /fakeid/.test(record._id) ?
                      <Button type='link' style={{padding:0}} onClick={() => this.remove(record._id)}>删除</Button> :
                      <Button type='link' style={{padding:0}} onClick={() => this.cancel(record._id)}>取消</Button>
                    }
                  </span> :
                  <span>
                    <Button type='link' style={{padding:0}} onClick={() => this.edit(record._id)}>编辑</Button>&nbsp;
                    <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record._id)}>
                      <Button type='link' style={{padding:0}}>删除</Button>
                    </Popconfirm>
                  </span>
              }
            </div>
          );
        },
      }]
    };
    this.timer=0;
    this.cacheBomData = [];
    this.queue={data:[], state:'sleep'};//state=sleep|run
  }

  getTotalQty(record, productQty=null){
    productQty=productQty===null?this.props.productQty:productQty;
    let total=record.qty/1000*productQty;
    let scrapRate=this.props.scrapRate?this.props.scrapRate:0;
    if(/\w-9[4567]/.test(record.item_name.value)){
      total=total.toFixed(3);
    }else{
      total=(total*(parseFloat(scrapRate)*0.01+1)).toFixed(3);
    }
    if(record.ceil){
      total=Math.ceil(total);
    }
    // if(/\w-(12|15|18|59|09|33|9[4567])/.test(record.item_name.value)){
    //   if(record.item_name.value!=='W-9401-0077'){
    //     if(record.unit==='ST'){
    //       total=Math.ceil(total);
    //     }
    //   }
    // }
    return total;
  }
  
  componentWillMount(){
    if(this.props.hiddenColumns && this.props.hiddenColumns.length){
      const columns=[
        ...this.state.columns.filter(
          (v,i,arr)=>
            this.props.hiddenColumns.findIndex((value,index)=>value!==v.key)!==-1
        )
      ];
      this.setState({columns: columns})
    }
    this.readBom(this.props.productName);
  }

  componentWillReceiveProps(nextProps){
    //获取出入库类型
    let stockType=this.props.stockType?this.props.stockType:'out';
    if(nextProps.stockType){
      stockType=stockType!==nextProps.stockType?nextProps.stockType:stockType;
    }
    //按条件刷新
    let refresh=false;
    if(this.props.productName!==nextProps.productName){
      refresh=true;
    }else{
      if(this.props.order._id!==nextProps.order._id) refresh=true;
    }
    if(this.props.refreshBom) refresh=true;
    if(this.props.stockType!==nextProps.stockType) refresh=true;
    if(refresh){
      this.readBom(nextProps.productName, stockType);
    }
    if(this.props.order._id===nextProps.order._id){
      if(this.props.productQty!==nextProps.productQty || this.props.scrapRate!==nextProps.scrapRate){
        //更新diff
        clearTimeout(this.timer);
        this.timer=setTimeout(() => {
          let newData = [...this.props.bomData];
          newData=newData.map((v,i,arr)=>{
            v.diff=this.getTotalQty(v, nextProps.productQty-this.props.order.qty.originValue)*(stockType==='out'?-1:1)
            return v;
          })
          this.props.updateBomData(newData)
        }, 250);
      }
    }
  }

  //行内编辑开始
  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={record.editable}
        value={text}
        column={column}
        onChange={value => this.handleChange(value, record._id, column)}
        autoCompleteData={this.state.autoCompleteData}
        record={record}
        onPressEnter={e=>this.save(record._id)}
      />
    );
  }
  //可编辑单元格实时输入处理验证
  handleChange(value, key, column) {
    const newData = [...this.props.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      //材料名验证防重
      if(column==='item_name'){
        let vaildate=[];
        if(!value){
          vaildate.push('empty');
        }else{
          let savedData=newData.filter(item=>!item.editable);
          for(let i in savedData){
            if(new RegExp(savedData[i][column].value,'i').test(value)){
              vaildate.push('dulplicate');
              break;
            }
          }
        }
        //验证通过时再运行自动完成
        if(vaildate.length===0){
          this.autoCompleteItem(value, key);
        }
        //此处value赋值的时机会影响autoCompleteItem的第一个参数取值
        value={
          value: value=value?value.toUpperCase():'',//转大写
          vaildate: vaildate
        };
      }
      //单位转大写
      if(['unit'].includes(column)){
        value=value?value.toUpperCase():'';
      }
      target[column] = value;
      this.props.updateBomData(newData)
    }
  }

  edit(key) {
    const newData = [...this.props.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target.editable = true;
      this.props.updateBomData(newData)
    }
  }

  save(key) {
    const newData = [...this.props.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      //检查item_name
      if(!target.item_name.value){
        message.error('材料名不能为空');
        return false;
      }
      //item_name再次防重
      let savedData=newData.filter(item=>!item.editable);
      for(let i in savedData){
        if(new RegExp(savedData[i].item_name.value,'i').test(target.item_name.value)){
          message.error('材料名重复');
          return false;
        }
      }
      delete target.editable;
      target.isNewRecord=false;
      this.props.updateBomData(newData)
      this.cacheBomData = newData.map(item => ({ ...item }));
      //更新插入item表
      const sendData={...target};
      sendData.item_name=sendData.item_name.value?sendData.item_name.value:sendData.item_name;
      ipcRenderer.send('u-item', sendData);
      //更新bom表
      this.updateBom(newData);
    }
  }
  
  cancel(key) {
    const newData = [...this.props.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      Object.assign(target, this.cacheBomData.filter(item => key === item._id)[0]);
      delete target.editable;
      this.props.updateBomData(newData)
    }
  }
  
  remove(key) {
    const bomData=[...this.props.bomData];
    const newData=bomData.filter(item=>item._id!==key); 
    this.props.updateBomData(newData)
    this.updateBom(newData);
  }
  //行内编辑结束

  //材料名自动完成
  autoCompleteItem=(value, key, callback='')=>{
    if(!value) return;
    if(!callback && this.queue.state==='run') return;//处理队列时禁用本方法
    if(callback) this.queue.state='run';
    value = value.toUpperCase();
    clearTimeout(this.timer);
    this.timer=setTimeout(() => {
      ipcRenderer.once('r-item', (event, docs)=>{
        //自动完成
        this.setState({autoCompleteData:docs.map(item=>item.name)})
        //自动填写匹配项
        const newData = [...this.props.bomData];
        const target = newData.filter(item => key === item._id)[0];
        target.desc='';
        target.unit='';
        for(let i in docs){
          if(docs[i].name===value){
            target.desc=docs[i].desc;
            target.unit=docs[i].unit;
            break;
          }
        }
        this.props.updateBomData(newData)
        //回调
        if(callback){
          this.queue.state='sleep';
          callback();
        }
      })
      ipcRenderer.send('r-item', value);
    }, 250);
  }

  updateBom=(newData)=>{
    //更新bom表
    ipcRenderer.send('u-bom', {
      product_name:this.props.productName,
      list:newData.map(item=>({
        product_name:item.product_name,
        item_name:item.item_name.value?item.item_name.value:item.item_name,
        qty:item.qty
      })),
    })
  }

  readBom=(pname, stockType='')=>{
    if(!stockType){
      stockType=this.props.stockType?this.props.stockType:'out';
    }
    if(pname){
      //查询对应的bom表
      ipcRenderer.once('r-bom', (event, docs)=>{
        if(docs.length && typeof(docs[0].item_name)==='string'){
          docs=docs.map(item=>{
            return Object.assign(item, {
              item_name:{value:item.item_name, vaildate:[]},/*vaildate:['duplicate','empty']*/
              diff:this.getTotalQty(item, this.props.productQty-this.props.order.qty.originValue)*(stockType==='out'?-1:1)
            });
          })
        }
        this.props.updateBomData(docs)
        this.cacheBomData=docs.map(item => ({ ...item }))
        // console.log(docs)
      })
      ipcRenderer.send('r-bom', {product_name:pname, hasStock:true})
    }else{
      this.props.updateBomData([])
      this.cacheBomData=[];
    }
    this.props.refreshBom && this.props.refreshBom();
  }

  addItem=(record={})=>{
    let data=this.props.bomData;
    let index=this.props.bomData.length?(this.props.bomData[this.props.bomData.length-1].index+1):1;
    let newRecord={
      _id:'fakeid'+(index),
      index:index,
      product_name:this.props.productName,
      item_name:{value:'', vaildate:[]},
      desc:'',
      qty:0,
      diff:0,
      unit:'',
      isNewRecord:true,
    };
    if(record.item_name){
      newRecord = Object.assign(newRecord, record);
    }
    data.push(newRecord);
    this.props.updateBomData(data)
    this.edit(newRecord._id)
    if(record.item_name){
      this.autoCompleteQueue(newRecord._id);
    }
  }
  //识图后进行自动完成
  autoCompleteQueue=(key='')=>{
    //添加到队列
    if(key){
      this.queue.data.push(key)
    }
    //处理队列
    if(this.queue.state==='run') return;
    if(this.queue.data.length<=0) return;
    key = this.queue.data.shift()
    let target = this.props.bomData.filter(item => key === item._id)[0];
    this.autoCompleteItem(target.item_name.value, key, this.autoCompleteQueue);
  }

  ocr = (filepath, type=2)=>{
    ipcRenderer.once('ocr', (event, args)=>{
      if(args.error_msg || args.errorMsg){
        if(args.error_msg){
          message.error(`${args.error_msg}`);
        }else if(args.errorMsg){
          message.error(`${args.errorMsg}`);
        }
        this.setState({ ocrLoading: false });
        return false;
      }
      message.success('请求成功');
      this.setState({ ocrLoading: false });
      let data=[], format_data=[];
      if(type===1){
        data=JSON.parse(args.result.result_data).forms[0].body;
        format_data=[];
        for(let v of data){
          if(!format_data[v.row[0]]){
            format_data[v.row[0]]=[];
          }
          format_data[v.row[0]][v.column[0]]=v.word.replace(/一/g,'-')
        }
        //导入bom
        for(let v of format_data){
          if(v[0]){
            let qty=parseFloat(v[2]);
            qty=qty?qty:0;
            this.addItem({item_name: {value:v[0].toUpperCase(),vaildate:[]}, qty: qty})
          }
        }
      }
      if(type===2){
        data=args.words_result;
        format_data=[];
        for(let i in data){
          format_data.push( data[i].words.replace(/一/g,'-') );
        }
        //导入bom
        for(let v of format_data){
          this.addItem({item_name: {value:v.toUpperCase(),vaildate:[]}})
        }
      }
    })
    ipcRenderer.send('ocr', {filepath:filepath, type:type});
    this.setState({ ocrLoading: true });
  }
  
  render() {
    return (
      <div>
        <Table {...{pagination:false}} dataSource={this.props.bomData} columns={this.state.columns} rowKey='_id' size="small" />
        <Row style={{marginTop:5}}>
          <Col span={21}>
            <Button style={{width:'100%'}} type="dashed" onClick={this.addItem} disabled={!this.props.productName}>+新增材料</Button>
          </Col>
          <Col span={3}>
            <Upload
              name='file'
              beforeUpload={(file)=>{ this.ocr(file.path); return false;}}
            >
              <Button style={{width:110, marginLeft:5}} type="dashed" disabled={!this.props.productName} icon="picture" loading={this.state.ocrLoading}>识图</Button>
            </Upload>
            <Popover content={(<img src={ocr_example} alt='图例' />)}><span className='ant-form-explain' style={{position:"absolute",bottom:-18,right:2,textDecoration:"underline",fontSize:"smaller"}}>图例</span></Popover>
          </Col>
        </Row>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    order: state.order,
    productName: state.order.product_name.value,
    productQty: state.order.qty.value,
    scrapRate: state.order.scrap_rate.value,
    bomData: state.bomData
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateBomData: (data) => {
      dispatch({type:'UPDATE_BOMDATA', bomData:data})
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(BomList)