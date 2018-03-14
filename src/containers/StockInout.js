import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, Select, InputNumber, Table, message } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const Option = Select.Option;

class StockInout extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bomData: [],
      autoCompleteData: [],
      type:'in'
    };
    this.timer=0;
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width:'2.5em',
    }, {
      title: '材料',
      dataIndex: 'item_name',
      key: 'item_name',
      width:'16%',
      className: 'item-name'
    }, {
      title: '描述',
      dataIndex: 'desc',
      key: 'desc',
    }, {
      title: '单位用量',
      dataIndex: 'qty',
      key: 'qty',
      width:'12%',
    }, {
      title: '总用量',
      dataIndex: 'total_qty',
      width:'12%',
      key: 'total_qty',
      render:(text, record) => <span style={{color:'#1890ff'}}>{text}</span>
    }, {
      title: '库存',
      dataIndex: 'stock_qty',
      width:'8%',
      key: 'stock_qty',
      render: text=>text?text:0
    }, {
      title: '数量',
      dataIndex: 'diff',
      width:'8%',
      key: 'diff',
      render: (text, record) => <InputNumber 
        style={{ margin: '-5px 0' }} 
        value={text}
        onChange={value => this.handleChange(value, record._id)}
      />
    }, {
      title: '单位',
      dataIndex: 'unit',
      width:'8%',
      key: 'unit',
    }];
  }

  componentWillMount(){
    this.readBom();
  }
  
  componentDidMount() {
  }
  
  componentWillReceiveProps(nextProps){
    if(this.props.confirmLoading!==nextProps.confirmLoading && nextProps.confirmLoading===true){
      this.handleSubmit()
    }
    if(this.props.order.product_name.value!==nextProps.order.product_name.value){
      this.readBom(nextProps.order.product_name.value);
    }else{
      this.readBom(this.props.order.product_name.value);
    }
  }
  
  componentWillUpdate(){
  }
  
  readBom=(v=this.props.order.product_name.value)=>{
    if(v){
      //查询对应的bom表
      ipcRenderer.once('r-bom', (event, docs)=>{
        docs=docs.map(d=>{
          let total_qty=(d.qty/1000*this.props.order.qty.value).toFixed(3);
          let diff=this.props.type==='in'?total_qty:total_qty*-1;
          return Object.assign(d,{diff, total_qty})
        })
        this.setState({bomData:docs})
        this.cacheBomData=docs.map(item => ({ ...item }))
      })
      ipcRenderer.send('r-bom', {product_name:v, hasStock:true})
    }else{
      this.setState({bomData:[]});
      this.cacheBomData=[];
    }
  }
  //可编辑单元格实时处理
  handleChange(value, key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    value=isNaN(value)?0:value;
    if (target) {
      target.diff = this.props.type==='in'?value:Math.abs(value)*-1;
      this.setState({ bomData: newData });
    }
  }

  handleSubmit = (e) => {
    e && e.preventDefault();
    ipcRenderer.once('u-stock', (event, args)=>{
      if(args.isSuccess){
        this.props.onProcessOver()
        this.readBom();//刷新库存
      }else{
        console.log(args)
        message.error(args.msg)
      }
    })
    ipcRenderer.send('u-stock', JSON.stringify({
      type: this.props.form.getFieldValue('type'),
      desc: this.props.form.getFieldValue('desc'),
      data: this.state.bomData
    }))
  }

  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 20 },
    };
    const type=this.props.type==='in'?'物料入库':'领料';
    const desc='订单'+this.props.order.product_name.value+'@'+moment(this.props.order.date.value).utcOffset(480).format('YYYY-MM-DD');

    return (
      <Form layout='horizontal'>
        <FormItem {...formItemLayout} label="类型">
          {getFieldDecorator('type', {
            initialValue:type
          })(
            <Select disabled>
              <Option value='物料入库'>物料入库</Option>
              <Option value='领料'>领料</Option>
            </Select>
          )}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('desc', {
            initialValue:desc
          })(
            <Input />
          )}
        </FormItem>
        <FormItem {...formItemLayout} label="BOM">
          <Table {...{pagination:false}} dataSource={this.state.bomData} columns={this.columns} rowKey='_id' size="small" />
        </FormItem>
      </Form>
    );
  }
}

const WrappedStockInout = Form.create({})(StockInout);

const mapStateToProps = (state) => {
  return {
    order: state.order
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedStockInout)