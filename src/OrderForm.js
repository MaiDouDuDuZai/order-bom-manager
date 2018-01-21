import React, { Component } from 'react';
import { Form, Input, InputNumber, DatePicker, Button, Table, AutoComplete } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const columns = [{
    title: '#',
    dataIndex: 'key',
    key: 'key',
    render: text => <a href="">{text}</a>,
  }, {
    title: '材料',
    dataIndex: 'material_name',
    key: 'material_name',
  }, {
    title: '描述',
    dataIndex: 'desc',
    key: 'desc',
  }, {
    title: '单位用量',
    dataIndex: 'qty',
    key: 'qty',
  }, {
    title: '总用量',
    dataIndex: 'qty_total',
    key: 'qty_total',
  }, {
    title: '操作',
    key: 'action',
    render: (text, record) => (
      <a href="">删除</a>
    ),
}];
const data = [{
  key:1,material_name:'aaa',desc:'bbb',qty:11,qty_total:22
}];

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
}

class OrderForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteDataSource: ['Burns Bay Road', 'Downing Street', 'Wall Street'],
    };
  }
  
  today=()=>{
    let d=new Date(); 
    return d.getFullYear()+'-'+((m=d.getMonth()+1+'')=>(m.length===1?'0'+m:m))()+'-'+d.getDate()
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        ipcRenderer.once('c-order', (event, args)=>{
          if(args.isSuccess){
            console.log('b')
            this.props.onCreated()
          }
        })
        console.log(this.props.form.getFieldsValue())
        ipcRenderer.send('c-order', JSON.stringify(this.props.form.getFieldsValue()))
      }
    });
  }

  render() {
    const { getFieldDecorator, getFieldsError } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 16 },
    };
    const dateFormat='YYYY-MM-DD';

    return (
      <Form layout='horizontal' onSubmit={this.handleSubmit}>
        <FormItem {...formItemLayout} label="产品">
          {getFieldDecorator('product_name', {
            rules: [{
              required: true, message: '产品名必须!',
            }],
          })(<AutoComplete
            dataSource={this.state.autoCompleteDataSource}
            placeholder="产品名"
            filterOption={(inputValue, option) => option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1}
          />)}
        </FormItem>
        <FormItem {...formItemLayout} label="数量">
          {getFieldDecorator('qty', {
            initialValue:0
          })(<InputNumber style={{width:'100%'}} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="日期">
          {getFieldDecorator('date', {
            initialValue:moment(this.today(), dateFormat)
          })(<DatePicker style={{width:'100%'}} format={dateFormat} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
            initialValue:''
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="BOM">
          <Table {...{pagination:false}} dataSource={data} columns={columns} />
        </FormItem>
        <FormItem {...{wrapperCol:{span: 16,offset: 4}}} style={{ textAlign: 'left' }}>
          <Button type="primary" htmlType="submit" disabled={hasErrors(getFieldsError())}>确定</Button>
          <Button type="default" style={{ marginLeft: 8 }}>取消</Button>
        </FormItem>
      </Form>
    );
  }
}

const WrappedOrderForm = Form.create()(OrderForm);

export default WrappedOrderForm;