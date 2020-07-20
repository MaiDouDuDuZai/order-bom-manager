import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, AutoComplete, message } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import Procedure from '../components/Procedure';
import { setTimeout } from 'core-js/library/web/timers';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

class ProductForm extends Component {
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
    this.props.form.validateFields((err, values) => {
      if (!err) {
        if(this.props.product._id){
          //更新
          let sendData={...this.props.product, ...this.props.form.getFieldsValue()};
          delete sendData.index;
          ipcRenderer.once('u-product', (event, args)=>{
            if(args.isSuccess){
              this.props.onProcessOver()
            }
          })
          ipcRenderer.send('u-product', sendData);
        }else{
          //新增
          let sendData = this.props.form.getFieldsValue();
          sendData.name = sendData.product_name;
          delete sendData.product_name;
          sendData.procedure = this.props.product.procedure;
          ipcRenderer.once('c-product', (event, args)=>{
            if(!args.isSuccess){
              message.error(args.msg);
            }
            this.props.onProcessOver()
          })
          ipcRenderer.send('c-product', JSON.stringify(sendData))
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
      ipcRenderer.once('r-product', (event, data)=>{
        let docs=data.list;
        this.setState({autoCompleteData:docs});
      })
      ipcRenderer.send('r-product', {name:this.props.product.product_name.value})
    },250)
  }
  
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 21 },
    };

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
            disabled={Boolean(this.props.product._id)}
          />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="工序">
          <Procedure />
        </FormItem>
      </Form>
    );
  }
}

const WrappedForm = Form.create({
  mapPropsToFields(props) {
    return {
      product_name: Form.createFormField({
        ...props.product.product_name,
        value: props.product.product_name.value,
      }),
      note: Form.createFormField({
        ...props.product.note,
        value: props.product.note.value,
      }),
    };
  },
  onFieldsChange(props, changedFields) {
    if(changedFields.product_name && changedFields.product_name.value){
      changedFields.product_name.value = changedFields.product_name.value.toUpperCase();
    }
    props.updateProduct(changedFields);
  },
})(ProductForm);

const mapStateToProps = (state) => {
  return {
    product: state.product,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProduct: (changedFields) => {
      dispatch({type:'UPDATE', product:changedFields})
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedForm)