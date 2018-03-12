import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, Button, Table, AutoComplete, Popconfirm } from 'antd';
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

const EditableCell = ({ editable, value, column, onChange, autoCompleteData, record }) => (
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
          : <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
        )
      : value
    }
  </div>
);

class BomList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bomData: [],
      autoCompleteData:[]
    };
    this.timer=0;
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width:'2.5em',
    }, {
      title: '材料',
      dataIndex: 'item_name.value',
      key: 'item_name.value',
      width:'16%',
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
      render:(text, record) => <span style={{color:'#1890ff'}}>{(record.qty/1000*this.props.productQty).toFixed(3)}</span>
    }, {
      title: '库存',
      dataIndex: 'stock_qty',
      width:'8%',
      key: 'stock_qty',
    }, {
    }, {
      title: '单位',
      dataIndex: 'unit',
      width:'8%',
      key: 'unit',
      render: (text, record) => this.renderColumns(text, record, 'unit'),
    }, {
      title: '操作',
      key: 'action',
      width:'12%',
      render: (text, record) => {
        const { editable } = record;
        return (
          <div className="editable-row-operations">
            {
              editable ?
                <span>
                  <a onClick={() => this.save(record._id)} disabled={record.item_name.vaildate.length}>保存</a>&nbsp;
                  {
                    record.isNewRecord===true || /fakeid/.test(record._id) ?
                    <a onClick={() => this.remove(record._id)}>删除</a> :
                    <a onClick={() => this.cancel(record._id)}>取消</a>
                  }
                </span> :
                <span>
                  <a onClick={() => this.edit(record._id)}>编辑</a>&nbsp;
                  <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record._id)}>
                    <a>删除</a>
                  </Popconfirm>
                </span>
            }
          </div>
        );
      },
    }];
    this.cacheBomData = []
  }
  
  componentWillMount(){
    this.readBom(this.props.productName);
  }

  componentWillReceiveProps(nextProps){
    if(this.props.productName!==nextProps.productName){
      this.readBom(nextProps.productName);
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
      />
    );
  }
  //可编辑单元格实时输入处理验证
  handleChange(value, key, column) {
    const newData = [...this.state.bomData];
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
      this.setState({ bomData: newData });
    }
  }

  edit(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target.editable = true;
      this.setState({ bomData: newData });
    }
  }

  save(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      delete target.editable;
      target.isNewRecord=false;
      this.setState({ bomData: newData });
      this.cacheBomData = newData.map(item => ({ ...item }));
      //更新插入item表
      const sendData={...target};
      sendData.item_name=sendData.item_name.value?sendData.item_name.value:sendData.item_name;
      ipcRenderer.send('u-item', sendData);
      this.updateBom(newData);
    }
  }
  
  cancel(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      Object.assign(target, this.cacheBomData.filter(item => key === item._id)[0]);
      delete target.editable;
      this.setState({ bomData: newData });
    }
  }
  
  remove(key) {
    const bomData=[...this.state.bomData];
    const newData=bomData.filter(item=>item._id!==key); 
    this.setState({bomData:newData});
    this.updateBom(newData);
  }
  //行内编辑结束

  //材料名自动完成
  autoCompleteItem=(value, key)=>{
    clearTimeout(this.timer);
    this.timer=setTimeout(() => {
      ipcRenderer.once('r-item', (event, docs)=>{
        //自动完成
        this.setState({autoCompleteData:docs.map(item=>item.name)})
        //自动填写匹配项
        const newData = [...this.state.bomData];
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
        this.setState({ bomData: newData });
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

  readBom=(v)=>{
    if(v){
      //查询对应的bom表
      ipcRenderer.once('r-bom', (event, docs)=>{
        if(docs.length && typeof(docs[0].item_name)==='string'){
          docs=docs.map(item=>Object.assign(item, {item_name:{value:item.item_name, vaildate:[]}}))//vaildate:['duplicate','empty']
        }
        this.setState({bomData:docs})
        this.cacheBomData=docs.map(item => ({ ...item }))
      })
      ipcRenderer.send('r-bom', {product_name:v, hasStock:true})
    }else{
      this.setState({bomData:[]});
      this.cacheBomData=[];
    }
  }

  addItem=()=>{
    let data=this.state.bomData;
    let newRecord={
      _id:'fakeid'+(this.state.bomData.length+1),
      index:this.state.bomData.length+1,
      product_name:this.props.productName,
      item_name:{value:'', vaildate:[]},
      desc:'',
      qty:0,
      unit:'',
      isNewRecord:true,
    };
    data.push(newRecord);
    this.setState({bomData:data})
    this.edit(newRecord._id)
  }

  render() {
    return (
      <div>
        <Table {...{pagination:false}} dataSource={this.state.bomData} columns={this.columns} rowKey='_id' size="small" />
        <Button type="dashed" style={{width:'100%', marginTop:10}} onClick={this.addItem} disabled={!this.props.productName}>+新增材料</Button>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    productName: state.order.product_name.value,
    productQty: state.order.qty.value
  }
}

export default connect(
  mapStateToProps
)(BomList)