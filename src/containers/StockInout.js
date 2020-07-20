import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, Select, message } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
import BomList from '../components/BomList';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const Option = Select.Option;

class StockInout extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refreshBom:false
    };
  }

  componentWillMount(){
  }
  
  componentDidMount() {
  }
  
  componentWillReceiveProps(nextProps){
    if(this.props.confirmLoading!==nextProps.confirmLoading && nextProps.confirmLoading===true){
      this.handleSubmit()
    }
  }
  
  componentWillUpdate(){
  }
  
  handleSubmit = (e) => {
    e && e.preventDefault();
    ipcRenderer.once('u-stock', (event, args)=>{
      if(args.isSuccess){
        this.props.onProcessOver()
        this.setState({refreshBom:()=>this.setState({refreshBom:false})})
        // this.readBom();//刷新库存
      }else{
        console.log(args)
        message.error(args.msg)
      }
    })
    ipcRenderer.send('u-stock', JSON.stringify({
      type: this.props.form.getFieldValue('type'),
      desc: this.props.form.getFieldValue('desc'),
      data: this.props.bomData
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
          <BomList hiddenColumns={['action']} refreshBom={this.state.refreshBom} stockType={this.props.type} />
        </FormItem>
      </Form>
    );
  }
}

const WrappedStockInout = Form.create({})(StockInout);

const mapStateToProps = (state) => {
  return {
    order: state.order,
    bomData: state.bomData
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