import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, Select, InputNumber, DatePicker, AutoComplete } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import BomList from './BomList';
import { setTimeout } from 'core-js/library/web/timers';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const Option = Select.Option;

class OrderForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteData: [],
    };
    this.timer=0;
  }

  componentDidMount() {
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
        if(this.props.order._id){
          //更新
          let sendData={...this.props.order, ...this.props.form.getFieldsValue()};
          delete sendData.index;
          ipcRenderer.once('u-order', (event, args)=>{
            if(args.isSuccess){
              this.props.onProcessOver()
            }
          })
          ipcRenderer.send('u-order', JSON.stringify(sendData));
        }else{
          //新增
          ipcRenderer.once('c-order', (event, args)=>{
            if(args.isSuccess){
              this.props.onProcessOver()
            }
          })
          ipcRenderer.send('c-order', JSON.stringify(this.props.form.getFieldsValue()))
        }
      }else{
        this.props.onValidateFailed()
      }
    });
  }

  readProduct=()=>{
    //fetch autoComplete data
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{
      ipcRenderer.once('r-product', (event, docs)=>{
        this.setState({autoCompleteData:docs});
      })
      ipcRenderer.send('r-product', this.props.order.product_name.value)
    },250)
  }
  
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 20 },
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
            onChange={this.readProduct}
            allowClear={true}
            dataSource={this.state.autoCompleteData}
            placeholder="产品名"
            disabled={Boolean(this.props.order._id)}
          />)}
        </FormItem>
        <FormItem {...formItemLayout} label="数量">
          {getFieldDecorator('qty', {
            initialValue:0
          })(<InputNumber style={{width:'100%'}} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="日期">
          {getFieldDecorator('date', {
            initialValue:moment()
          })(<DatePicker style={{width:'100%'}} format={dateFormat} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="客户">
          {getFieldDecorator('customer_name', {
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="状态">
          {getFieldDecorator('status', {
            initialValue:'未生产'
          })(
            <Select>
              <Option value="未生产">未生产</Option>
              <Option value="生产中">生产中</Option>
              <Option value="已完成">已完成</Option>
            </Select>
          )}
        </FormItem>
        <FormItem {...formItemLayout} label="BOM">
          <BomList />
        </FormItem>
      </Form>
    );
  }
}

const WrappedOrderForm = Form.create({
  mapPropsToFields(props) {
    return {
      product_name: Form.createFormField({
        ...props.order.product_name,
        value: props.order.product_name.value,
      }),
      qty: Form.createFormField({
        ...props.order.qty,
        value: props.order.qty.value,
      }),
      date: Form.createFormField({
        ...props.order.date,
        value: moment(props.order.date.value),
      }),
      customer_name: Form.createFormField({
        ...props.order.customer_name,
        value: props.order.customer_name.value,
      }),
      note: Form.createFormField({
        ...props.order.note,
        value: props.order.note.value,
      }),
      status: Form.createFormField({
        ...props.order.status,
        value: props.order.status.value,
      }),
    };
  },
  onFieldsChange(props, changedFields) {
    props.updateOrder(changedFields);
  },
})(OrderForm);

const mapStateToProps = (state) => {
  return {
    order: state.order
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateOrder: (changedFields) => {
      dispatch({type:'UPDATE_ORDER', order:changedFields})
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedOrderForm)