import React, { Component } from 'react';
import { Form, Input, InputNumber, DatePicker, Button, Table, AutoComplete, Popconfirm } from 'antd';
import moment from 'moment';
import 'moment/locale/zh-cn';
moment.locale('zh-cn');
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
}

const EditableCell = ({ editable, value, onChange }) => (
  <div>
    {editable
      ? <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
      : value
    }
  </div>
);

class OrderForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoCompleteData: [],
      bomData: [],
      product_name:''
    };
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width:'5%',
      render: text => <a href="">{text}</a>,
    }, {
      title: '材料',
      dataIndex: 'material_name',
      key: 'material_name',
      width:'25%',
      render: (text, record) => this.renderColumns(text, record, 'material_name'),
    }, {
      title: '描述',
      dataIndex: 'desc',
      key: 'desc',
      render: (text, record) => this.renderColumns(text, record, 'desc'),
    }, {
      title: '单位用量',
      dataIndex: 'qty',
      key: 'qty',
      width:'13%',
      render: (text, record) => this.renderColumns(text, record, 'qty'),
    }, {
      title: '总用量',
      dataIndex: 'qty_total',
      width:'15%',
      key: 'qty_total',
    }, {
      title: '单位',
      dataIndex: 'unit',
      width:'8%',
      key: 'unit',
      render: (text, record) => this.renderColumns(text, record, 'unit'),
    }, {
      title: '操作',
      key: 'action',
      width:'15%',
      render: (text, record) => {
        const { editable } = record;
        return (
          <div className="editable-row-operations">
            {
              editable ?
                <span>
                  <a onClick={() => this.save(record._id)} disabled={record.isDulplicate}>保存</a>&nbsp;
                    <a onClick={() => this.cancel(record._id)}>取消</a>
                </span> :
                <span>
                  <a onClick={() => this.edit(record._id)}>编辑</a>&nbsp;
                  <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record._id)}>
                    <a>删除</a>
                  </Popconfirm>
                </span>
            }
          </div>
        );
      },
    }];
    this.cacheData = this.state.bomData.map(item => ({ ...item }));
  }

  componentDidMount() {
    this.readProduct()
  }

//行内编辑开始
  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={record.editable}
        value={text}
        onChange={value => this.handleChange(value, record._id, column)}
      />
    );
  }
  
  handleChange(value, key, column) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target[column] = value;
      if(column==='material_name'){
        //材料名验证
        let isDulplicate=false;
        let savedData=newData.filter(item=>!(new RegExp('fakeid').test(item._id)))
        for(let i in savedData){
          if(new RegExp(savedData[i]['material_name'],'i').test(value)){
            isDulplicate=true;
          }
        }
        target['isDulplicate']=isDulplicate;
      }
      this.setState({ data: newData });
    }
  }

  edit(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target.editable = true;
      this.setState({ data: newData });
    }
  }

  save(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      delete target.editable;
      this.setState({ data: newData });
      this.cacheData = newData.map(item => ({ ...item }));
    }
  }

  cancel(key) {
    const newData = [...this.state.bomData];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      Object.assign(target, this.cacheData.filter(item => key === item._id)[0]);
      delete target.editable;
      this.setState({ data: newData });
    }
  }
//行内编辑结束

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        ipcRenderer.once('c-order', (event, args)=>{
          if(args.isSuccess){
            this.props.onCreated()
          }
        })
        ipcRenderer.send('c-order', JSON.stringify(this.props.form.getFieldsValue()))
      }
    });
  }

  handleProductNameChange=(v)=>{
    this.setState({product_name:v})
    this.readProduct(v)
    if(v){
      //查询对应的bom表
      ipcRenderer.once('r-bom', (event, docs)=>{
        this.setState({bomData:docs.map((item)=>Object.assign(item,{isDulplicate:false}))})
      })
      ipcRenderer.send('r-bom', {product_name:v})
    }
  }

  readProduct=(v)=>{
    //fetch autoComplete data
    ipcRenderer.once('r-product', (event, docs)=>{
      this.setState({autoCompleteData:docs});
    })
    ipcRenderer.send('r-product', v)
  }

  addMaterial=()=>{
    let data=this.state.bomData;
    let newRecord={
      _id:'fakeid'+(this.state.bomData.length+1),
      index:this.state.bomData.length+1,
      product_name:this.state.product_name,
      material_name:'',
      desc:'',
      qty:0,
      unit:''
    };
    data.push(newRecord);
    this.setState({bomData:data})
    this.edit(newRecord._id)
  }

  render() {
    const { getFieldDecorator, getFieldsError } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 3 },
      wrapperCol: { span: 18 },
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
            allowClear={true}
            onChange={this.handleProductNameChange}
            dataSource={this.state.autoCompleteData}
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
            initialValue:moment()
          })(<DatePicker style={{width:'100%'}} format={dateFormat} />)}
        </FormItem>
        <FormItem {...formItemLayout} label="备注">
          {getFieldDecorator('note', {
            initialValue:''
          })(<Input />)}
        </FormItem>
        <FormItem {...{labelCol:{ span: 3 },wrapperCol:{ span: 18 }}} label="BOM">
          <Table {...{pagination:false}} dataSource={this.state.bomData} columns={this.columns} rowKey='_id' size="small" />
          <Button type="dashed" style={{width:'100%', marginTop:10}} onClick={this.addMaterial} disabled={!this.state.product_name}>+新增材料</Button>
        </FormItem>
        <FormItem {...{wrapperCol:{span: 16,offset: 3}}} style={{ textAlign: 'left' }}>
          <Button type="primary" htmlType="submit" disabled={hasErrors(getFieldsError())}>确定</Button>
          <Button type="default" style={{ marginLeft: 8 }}>取消</Button>
        </FormItem>
      </Form>
    );
  }
}

const WrappedOrderForm = Form.create()(OrderForm);

export default WrappedOrderForm;