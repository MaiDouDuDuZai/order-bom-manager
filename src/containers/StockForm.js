import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, AutoComplete, Select, InputNumber, message } from 'antd';
import '../App.css';
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;
const Option = Select.Option;

class StockForm extends Component {
  constructor(props) {
    super(props);
    this.state={
      autoCompleteData:[],
    };
  }

  componentWillReceiveProps(nextProps){
    if(this.props.confirmLoading!==nextProps.confirmLoading && nextProps.confirmLoading===true){
      this.handleSubmit()
    }
  }

  //自动填充匹配物品信息 & 物品名自动完成
  fillItemDetail = (item_name) => {
    //autoComplete
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{
      ipcRenderer.once('r-item', (event, docs)=>{
        const autoCompleteData=docs.map(i=>i.name)
        this.setState({autoCompleteData});
        //有完全匹配的物品时,填充详情，没有时清空
        let matchItem=docs.filter(i=>i.name===item_name);
        if(matchItem.length){
          matchItem=matchItem[0];
          this.props.form.setFieldsValue({
            cate: matchItem.cate,
            desc: matchItem.desc,
            unit: matchItem.unit,
          });
        }else{
          this.props.form.setFieldsValue({
            cate: '',
            desc: '',
            unit: '',
          });
        }
      })
      ipcRenderer.send('r-item', item_name)
    },250)
  }

  handleSubmit = (e) => {
    e && e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        //新增
        ipcRenderer.once('c-itemStock', (event, args)=>{
          if(args.isSuccess){
            this.props.afterCreated()
          }else{
            message.error(args.msg)
            this.props.onValidateFailed()
          }
        })
        ipcRenderer.send('c-itemStock', JSON.stringify(this.props.form.getFieldsValue()))
      }else{
        this.props.onValidateFailed()
      }
    });
  }

  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 20 },
    };
    return (
      <div>
        <Form layout='horizontal'>
          <FormItem {...formItemLayout} label="物品">
            {getFieldDecorator('item_name', {
              rules: [{
                required: true, message: '物品必须!',
              }],
            })(<AutoComplete
              onChange={this.fillItemDetail}
              allowClear={true}
              dataSource={this.state.autoCompleteData}
              placeholder="材料、设备等"
            />)}
          </FormItem>
          <FormItem {...formItemLayout} label="描述">
            {getFieldDecorator('desc', {
            })(<Input />)}
          </FormItem>
          <FormItem {...formItemLayout} label="单位">
            {getFieldDecorator('unit', {
            })(<Input />)}
          </FormItem>
          <FormItem {...formItemLayout} label="分类">
            {getFieldDecorator('cate', {
            })(
              <Select>
                {this.props.cates.map(cate => <Option key={cate}>{cate}</Option>)}
              </Select>
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="库存">
            {getFieldDecorator('qty', {
              initialValue:0
            })(<InputNumber style={{width:'100%'}} />)}
          </FormItem>
        </Form>
      </div>
    );
  }
}

const WrappedStockForm = Form.create({
  mapPropsToFields(props) {
    return {
      item_name: Form.createFormField({
        ...props.itemStock.item_name,
        value: props.itemStock.item_name.value,
      }),
      desc: Form.createFormField({
        ...props.itemStock.desc,
        value: props.itemStock.desc.value,
      }),
      unit: Form.createFormField({
        ...props.itemStock.unit,
        value: props.itemStock.unit.value,
      }),
      cate: Form.createFormField({
        ...props.itemStock.cate,
        value: props.itemStock.cate.value,
      }),
      qty: Form.createFormField({
        ...props.itemStock.qty,
        value: props.itemStock.qty.value,
      }),
    };
  },
  onFieldsChange(props, changedFields) {
    if(changedFields.item_name){
      changedFields.item_name.value=changedFields.item_name.value.toUpperCase();
    }
    if(changedFields.unit){
      changedFields.unit.value=changedFields.unit.value.toUpperCase();
    }
    props.updateItemStock(changedFields);
  },
})(StockForm);

const mapStateToProps = (state) => {
  return {
    itemStock: state.itemStock,
    cates: state.cates
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateItemStock: (changedFields) => {
      Object.keys(changedFields).length && dispatch({type:'UPDATE_ITEMSTOCK', itemStock:changedFields})
    },
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedStockForm)