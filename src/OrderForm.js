import React, { Component } from 'react';
import { Form, Input, Button, Table } from 'antd';
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
  constructor() {
    super();
    this.state = {
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
        ipcRenderer.send('c-order', JSON.stringify(this.props.form.getFieldsValue()))
      }
    });
  }
  render() {
    const { getFieldDecorator, getFieldsError } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 14 },
    };

    return (
      <Form layout='horizontal' onSubmit={this.handleSubmit}>
        <FormItem {...formItemLayout} label="产品">
          {getFieldDecorator('product_name', {
            rules: [{
              required: true, message: '产品名必须!',
            }],
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="数量">
          {getFieldDecorator('qty', {
            initialValue:0
          })(<Input type="number" />)}
        </FormItem>
        <FormItem {...formItemLayout} label="日期">
          {getFieldDecorator('date', {
            initialValue:this.today()
          })(<Input type="date" />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
            initialValue:''
          })(<Input />)}
        </FormItem>
        <Table {...{pagination:false}} dataSource={data} columns={columns} />
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