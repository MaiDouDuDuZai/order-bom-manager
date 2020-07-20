import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, Select, InputNumber, DatePicker, AutoComplete, message } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import BomList from '../components/BomList';
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
      refreshBom:false
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
    //订单提交
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
    //库存提交
    ipcRenderer.once('u-stock', (event, args)=>{
      if(args.isSuccess){
        this.props.onProcessOver()
        //刷新库存
        this.setState({refreshBom:()=>this.setState({refreshBom:false})})
      }else{
        console.log(args)
        message.error(args.msg)
      }
    })
    ipcRenderer.send('u-stock', JSON.stringify({
      type: '订单',
      desc: '订单'+this.props.order.product_name.value+'@'+moment(this.props.order.date.value).utcOffset(480).format('YYYY-MM-DD'),
      data: this.props.bomData
    }))
  }

  readProduct=()=>{
    //fetch autoComplete data
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{
      ipcRenderer.once('r-product', (event, data)=>{
        let docs=data.list;
        this.setState({autoCompleteData:docs});
        if(docs[0]){
          this.props.form.setFieldsValue({scrap_rate:docs[0].scrap_rate});
        }
      })
      ipcRenderer.send('r-product', {name:this.props.order.product_name.value})
    },250)
  }
  
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 21 },
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
            dataSource={this.state.autoCompleteData.map((item)=>item.name)}
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
        <FormItem {...formItemLayout} label="报废率" help="*-9[4567]...的材料不计算报废率">
          {getFieldDecorator('scrap_rate', {
          })(<Input addonAfter="%" />)}
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
          <BomList hiddenColumns={[]} refreshBom={this.state.refreshBom} />
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
      scrap_rate: Form.createFormField({
        ...props.order.scrap_rate,
        value: props.order.scrap_rate.value,
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
    if(changedFields.product_name && changedFields.product_name.value){
      changedFields.product_name.value = changedFields.product_name.value.toUpperCase();
    }
    props.updateOrder(changedFields);
  },
})(OrderForm);

const mapStateToProps = (state) => {
  return {
    order: state.order,
    bomData: state.bomData
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