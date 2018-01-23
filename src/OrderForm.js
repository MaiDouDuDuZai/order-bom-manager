import React, { Component } from 'react';
import { Form, Input, InputNumber, DatePicker, Button, AutoComplete } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import BomList from './BomList';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
}

class OrderForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteData: [],
      product_name:'',
      qty:0
    };
  }

  componentDidMount() {
    this.readProduct();
  }

  componentWillReceiveProps(nextProps){
    if(this.props.confirmLoading!==nextProps.confirmLoading && nextProps.confirmLoading===true){
      this.handleSubmit()
    }
  }
  
  handleSubmit = (e) => {
    e && e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        ipcRenderer.once('c-order', (event, args)=>{
          if(args.isSuccess){
            this.props.onNewOrderCreated()
          }
        })
        ipcRenderer.send('c-order', JSON.stringify(this.props.form.getFieldsValue()))
      }else{
        this.props.onValidateFailed()
      }
    });
  }

  handleProductChange=(v)=>{
    this.setState({product_name:v});
    this.readProduct(v);
  }

  readProduct=(v)=>{
    //fetch autoComplete data
    ipcRenderer.once('r-product', (event, docs)=>{
      this.setState({autoCompleteData:docs});
    })
    ipcRenderer.send('r-product', v)
  }
  
  render() {
    const { getFieldDecorator, getFieldsError } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 3 },
      wrapperCol: { span: 18 },
    };
    const dateFormat='YYYY-MM-DD';

    return (
      <Form layout='horizontal'>
        <FormItem {...formItemLayout} label="产品">
          {getFieldDecorator('product_name', {
            rules: [{
              required: true, message: '产品名必须!',
            }],
          })(<AutoComplete
            onChange={this.handleProductChange}
            allowClear={true}
            dataSource={this.state.autoCompleteData}
            placeholder="产品名"
          />)}
        </FormItem>
        <FormItem {...formItemLayout} label="数量">
          {getFieldDecorator('qty', {
            initialValue:0
          })(<InputNumber onChange={(v)=>this.setState({qty:v})} style={{width:'100%'}} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="日期">
          {getFieldDecorator('date', {
            initialValue:moment()
          })(<DatePicker style={{width:'100%'}} format={dateFormat} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
            initialValue:''
          })(<Input />)}
        </FormItem>
        <FormItem {...{labelCol:{ span: 3 },wrapperCol:{ span: 18 }}} label="BOM">
          <BomList productName={this.state.product_name} productQty={this.state.qty} />
        </FormItem>
      </Form>
    );
  }
}

const WrappedOrderForm = Form.create()(OrderForm);

export default WrappedOrderForm;