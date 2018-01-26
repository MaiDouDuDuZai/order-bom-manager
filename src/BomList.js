import React, { Component } from 'react';
import { Input, Button, Table, AutoComplete, Popconfirm } from 'antd';
const {ipcRenderer} = window.require('electron')

const EditableCell = ({ editable, value, column, onChange, autoCompleteData }) => (
  <div>
    {editable
      ? (
          column==='material_name' ?
            <AutoComplete 
              style={{ margin: '-5px 0' }}
              value={value} 
              onChange={v => onChange(v)}
              dataSource={autoCompleteData}
              allowClear={true}
            />
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
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width:'6%',
    }, {
      title: '材料',
      dataIndex: 'material_name',
      key: 'material_name',
      width:'22%',
      render: (text, record) => this.renderColumns(text, record, 'material_name'),
    }, {
      title: '描述',
      dataIndex: 'desc',
      key: 'desc',
      render: (text, record) => this.renderColumns(text, record, 'desc'),
    }, {
      title: '单位用量',
      dataIndex: 'qty',
      key: 'qty',
      width:'11%',
      render: (text, record) => this.renderColumns(text, record, 'qty'),
    }, {
      title: '总用量',
      dataIndex: 'qty_total',
      width:'10%',
      key: 'qty_total',
      render:(text, record) => <span style={{color:'#1890ff'}}>{(record.qty/1000*this.props.productQty).toFixed(3)}</span>
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
                  <a onClick={() => this.save(record._id)} disabled={record.isDulplicate || !record.material_name}>保存</a>&nbsp;
                    <a onClick={() => this.cancel(record._id)}>取消</a>
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
      />
    );
  }
  
  handleChange(value, key, column) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      if(['material_name','unit'].includes(column)){
        //材料名,单位转大写
        value=value?value.toUpperCase():'';
      }
      target[column] = value;
      if(column==='material_name'){
        //材料名验证
        let isDulplicate=false;
        let savedData=newData.filter(item=>!item.editable);
        for(let i in savedData){
          if(new RegExp(savedData[i]['material_name'],'i').test(value)){
            isDulplicate=true;
          }
        }
        target['isDulplicate']=isDulplicate;
        this.readMaterial(value, key);
      }
      this.setState({ data: newData });
    }
  }

  edit(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target.editable = true;
      this.setState({ data: newData });
    }
  }

  save(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      delete target.editable;
      this.setState({ data: newData });
      this.cacheBomData = newData.map(item => ({ ...item }));
      //更新插入material表
      ipcRenderer.send('u-material', target)
      this.updateBom(newData);
    }
  }
  
  cancel(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      Object.assign(target, this.cacheBomData.filter(item => key === item._id)[0]);
      delete target.editable;
      this.setState({ data: newData });
    }
  }
  
  remove(key) {
    const bomData=[...this.state.bomData];
    const newData=bomData.filter(item=>item._id!==key); 
    this.setState({bomData:newData});
    this.updateBom(newData);
  }
//行内编辑结束

  readMaterial=(value, key)=>{
    //材料名autoComplete
    ipcRenderer.once('r-material', (event, docs)=>{
      this.setState({autoCompleteData:docs.map(item=>item.name)})
      for(let i in docs){
        if(docs[i].name===value){
          const newData = [...this.state.bomData];
          const target = newData.filter(item => key === item._id)[0];
          target.desc=docs[i].desc;
          target.unit=docs[i].unit;
          this.setState({ data: newData });
          break;
        }
      }
    })
    ipcRenderer.send('r-material', value);
  }

  updateBom=(newData)=>{
    //更新bom表
    ipcRenderer.send('u-bom', {
      product_name:this.props.productName,
      list:newData.map(item=>({
        product_name:item.product_name,
        material_name:item.material_name,
        qty:item.qty
      })),
    })
  }

  readBom=(v)=>{
    if(v){
      //查询对应的bom表
      ipcRenderer.once('r-bom', (event, docs)=>{
        docs=docs.map((item)=>Object.assign(item,{isDulplicate:false}))
        this.setState({bomData:docs})
        this.cacheBomData=docs.map(item => ({ ...item }))
      })
      ipcRenderer.send('r-bom', {product_name:v})
    }else{
      this.setState({bomData:[]});
      this.cacheBomData=[];
    }
  }

  addMaterial=()=>{
    let data=this.state.bomData;
    let newRecord={
      _id:'fakeid'+(this.state.bomData.length+1),
      index:this.state.bomData.length+1,
      product_name:this.props.productName,
      material_name:'',
      desc:'',
      qty:0,
      unit:''
    };
    data.push(newRecord);
    this.setState({bomData:data})
    this.edit(newRecord._id)
  }

  render() {
    return (
      <div>
        <Table {...{pagination:false}} dataSource={this.state.bomData} columns={this.columns} rowKey='_id' size="small" />
        <Button type="dashed" style={{width:'100%', marginTop:10}} onClick={this.addMaterial} disabled={!this.props.productName}>+新增材料</Button>
      </div>
    )
  }
}

export default BomList;