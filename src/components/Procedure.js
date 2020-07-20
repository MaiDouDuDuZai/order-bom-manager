import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Input, Button, Table, Popconfirm, message, Row, Col, Form } from 'antd';
const FormItem = Form.Item;

const EditableCell = ({ editable, value, column, onChange, record, onPressEnter }) => (
  <div>
    {editable
      ? (
        column==='procedure_name' ?
        <FormItem
          validateStatus={record.procedure_name.vaildate.length?'error':'success'} 
          help={
            record.procedure_name.vaildate.length?
            {empty:'不能为空',dulplicate:'工序名重复'}[record.procedure_name.vaildate[0]]
            :''
          }
        >
          <Input 
            style={{ margin: '-5px 0' }} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            onPressEnter={e=>onPressEnter(e)}
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

class Procedure extends Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [{
        title: '#',
        dataIndex: 'index',
        key: 'index',
        width:'2.5em',
      }, {
        title: '工序名',
        dataIndex: 'procedure_name.value',
        key: 'procedure_name.value',
        width:'18%',
        render: (text, record) => this.renderColumns(text, record, 'procedure_name'),
        className: 'item-name'
      }, {
        title: '工价(￥)',
        dataIndex: 'price',
        key: 'price',
        render: (text, record) => this.renderColumns(text, record, 'price'),
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
                  <Button type='link' style={{padding:0}} onClick={() => this.save(record.index)}>保存</Button>&nbsp;
                  {
                    record.isNewRecord===true ?
                    <Button type='link' style={{padding:0}} onClick={() => this.remove(record.index)}>删除</Button> :
                    <Button type='link' style={{padding:0}} onClick={() => this.cancel(record.index)}>取消</Button>
                  }
                </span> :
                <span>
                  <Button type='link' style={{padding:0}} onClick={() => this.edit(record.index)}>编辑</Button>&nbsp;
                  <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record.index)}>
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
    this.cacheData = [];
  }

  componentWillMount(){
    this.load();
  }

  componentWillReceiveProps(nextProps){
    //按条件刷新
    let refresh=false;
    if(this.props.product._id!==nextProps.product._id){
      refresh=true;
    }else{
      if(this.props._id!==nextProps._id) refresh = true;
    }
    if(refresh){
      this.load(true);
    }
  }

  //行内编辑开始
  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={record.editable}
        value={text}
        column={column}
        onChange={value => this.handleChange(value, record.index, column)}
        record={record}
        onPressEnter={e=>this.save(record.index)}
      />
    );
  }
  //可编辑单元格实时输入处理验证
  handleChange(value, key, column) {
    const newData = [...this.props.product.procedure];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      //材料名验证防重
      if(column==='procedure_name'){
        let vaildate=[];
        if(!value){
          vaildate.push('empty');
        }else{
          let savedData=newData.filter(item=>!item.editable);
          for(let i in savedData){
            if(savedData[i][column].value === value){
              vaildate.push('dulplicate');
              break;
            }
          }
        }
        value={
          value: value,
          vaildate: vaildate,
        };
      }
      target[column] = value;
      this.props.update(newData)
    }
  }

  edit(key) {
    const newData = [...this.props.product.procedure];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      target.editable = true;
      this.props.update(newData)
    }
  }

  save(key) {
    const newData = [...this.props.product.procedure];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      //检查procedure_name
      if(!target.procedure_name.value){
        message.error('名称不能为空');
        return false;
      }
      //procedure_name再次防重
      let savedData=newData.filter(item=>!item.editable);
      for(let i in savedData){
        if(new RegExp(savedData[i].procedure_name.value,'i').test(target.procedure_name.value)){
          message.error('名称重复');
          return false;
        }
      }
      delete target.editable;
      target.isNewRecord=false;
      this.props.update(newData)
      this.cacheData = newData.map(item => ({ ...item }));
    }
  }
  
  cancel(key) {
    const newData = [...this.props.product.procedure];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      Object.assign(target, this.cacheData.filter(item => key === item.index)[0]);
      delete target.editable;
      this.props.update(newData)
    }
  }
  
  remove(key) {
    const procedure=[...this.props.product.procedure];
    const newData=procedure.filter(item=>item.index!==key); 
    this.props.update(newData)
  }
  //行内编辑结束

  load=(fromProps = false)=>{
    if(fromProps){
      this.cacheData = this.props.product.procedure || [];
    }else{
      this.cacheData=[];
    }
  }

  addItem=(record={})=>{
    let data=this.props.product.procedure;
    let index=this.props.product.procedure.length?(this.props.product.procedure[this.props.product.procedure.length-1].index+1):1;
    let newRecord={
      index:index,
      procedure_name:{value:'', vaildate:[]},
      price:0,
      isNewRecord:true,
    };
    if(record.procedure_name){
      newRecord = Object.assign(newRecord, record);
    }
    data.push(newRecord);
    this.props.update(data)
    this.edit(newRecord.index)
  }

  render() {
    return (
      <div>
        <Table 
          dataSource={this.props.product.procedure} 
          columns={this.state.columns} 
          rowKey='index' 
          size="small" 
          pagination={false}
          footer={pageData => {
            let totalPrice = 0;
            if(pageData.length){
              totalPrice = pageData.reduce((total, row) => {return total + (row.price * 100)}, 0)
            }
            totalPrice = totalPrice / 100;
            let totalRow = [{index:'#', procedure_name:{value:'合计'}, price: totalPrice, note:''}];
            let columns = JSON.parse(JSON.stringify(this.state.columns));
            return (<Table 
              showHeader={false}
              dataSource={totalRow} 
              columns={columns} 
              rowKey='index' 
              size="small" 
              pagination={false}
              style={{border:'none'}}
            />)
          }}
        />
        <Row style={{marginTop:5}}>
          <Col span={24}>
            <Button style={{width:'100%'}} type="dashed" onClick={this.addItem} disabled={!this.props.product.product_name}>+新增工序</Button>
          </Col>
        </Row>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    product: state.product,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    update: (data) => {
      dispatch({type:'UPDATE', product: {procedure: data}})
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Procedure)