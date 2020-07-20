import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, AutoComplete, message, Select } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import { setTimeout } from 'core-js/library/web/timers';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const { Option } = Select;
const { TextArea } = Input;

class StaffForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteData: [],
      refreshBom:false,
      procedureOptions: []
    };
    this.timer=0;
  }

  componentDidMount() {
    //初始化工序选项
    if(this.props.staff && this.props.staff.product_name){
      this.readProduct(this.props.staff.product_name, () => {
        this.loadProcedure(this.props.staff.product_name)
      })
    }
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
        let sendData = this.props.form.getFieldsValue();
        console.log(this.props.staff, sendData)
        if(this.props.staff){
          //更新
          sendData._id = this.props.staff._id;
          delete sendData.index;
          ipcRenderer.once('u-staff', (event, args)=>{
            if(args.isSuccess){
              this.props.onProcessOver()
            }
          })
          ipcRenderer.send('u-staff', sendData);
        }else{
          //新增
          ipcRenderer.once('c-staff', (event, args)=>{
            if(!args.isSuccess){
              message.error(args.msg);
            }
            this.props.onProcessOver()
          })
          ipcRenderer.send('c-staff', JSON.stringify(sendData))
        }
      }else{
        this.props.onValidateFailed()
      }
    });
  }

  readProduct=(v, complete = ()=>{})=>{
    //fetch autoComplete data
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{
      ipcRenderer.once('r-product', (event, data)=>{
        let docs=data.list;
        this.setState({autoCompleteData:docs}, ()=>{
          if(complete !== null) complete();
        });
      })
      ipcRenderer.send('r-product', {name: v})
    },250)
  }

  loadProcedure = (value) => {
    const target = this.state.autoCompleteData.find(v => v.name === value);
    const procedure_options = target.procedure ? target.procedure.map(v => v = v.procedure_name.value) : [];
    this.setState({procedureOptions: procedure_options})
  }
  
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 21 },
    };

    return (
      <Form layout='horizontal'>
        <FormItem {...formItemLayout} label="姓名">
          {getFieldDecorator('staff_name', {
            rules: [{required: true, message: '姓名必须!',}],
            initialValue: this.props.staff ? this.props.staff.staff_name : ''
          })(<Input />)}
        </FormItem>
        <FormItem {...formItemLayout} label="当前产品">
          {getFieldDecorator('product_name', {
            initialValue: this.props.staff ? this.props.staff.product_name : ''
          })(<AutoComplete
            onChange={(v) => this.readProduct(v)}
            onSelect={this.loadProcedure}
            allowClear={true}
            dataSource={this.state.autoCompleteData.map((item)=>item.name)}
            placeholder="产品名"
          />)}
        </FormItem>
        <FormItem {...formItemLayout} label="当前工序">
          {getFieldDecorator('procedure_name', {
            initialValue: this.props.staff ? this.props.staff.procedure_name : ''
          })(
            <Select style={{ width: 120 }}>
              {
                this.state.procedureOptions.map(v => (
                  <Option key={v} value={v} label={v}>{v}</Option>
                ))
              }
            </Select>
          )}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
            initialValue: this.props.staff ? this.props.staff.note : ''
          })(<TextArea row={3} />)}
        </FormItem>
      </Form>
    );
  }
}

const WrappedForm = Form.create({ name: 'staff_form' })(StaffForm);

const mapStateToProps = (state) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedForm)