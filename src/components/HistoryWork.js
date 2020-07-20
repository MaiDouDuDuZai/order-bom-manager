import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Input, Button, Table, Popconfirm, message, Row, Col, DatePicker, AutoComplete, Select } from 'antd';
import moment from 'moment';
import locale from 'antd/es/date-picker/locale/zh_CN';
const Option = Select.Option;
const {ipcRenderer} = window.require('electron')

const EditableCell = ({ editable, value, column, onChange, onSelect, record, onPressEnter, autoCompleteData, procedureOptions }) => {
  let component = null;
  switch(column){
    case 'date':
      component = <DatePicker locale={locale} value={moment(value)} onChange={(momentDate, stringDate)=>onChange(stringDate, record.index, column)} />
      break;
    case 'product_name':
      component = <AutoComplete 
        style={{ margin: '-5px 0' }}
        value={value} 
        onChange={v => onChange(v)}
        onSelect={onSelect}
        dataSource={autoCompleteData.map(item=>item.name)}
        allowClear={true}
      />
      break;
    case 'procedure_name':
      component = <Select style={{ width: 120 }} onChange={v => onChange(v)} defaultValue={value}>
      {
        procedureOptions.map(v => (
          <Option key={v.procedure_name.value} value={v.procedure_name.value} label={v.procedure_name.value}>{v.procedure_name.value}</Option>
        ))
      }
    </Select>
      break;
    default:
      component = <Input 
        style={{ margin: '-5px 0' }} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        onPressEnter={e=>onPressEnter(e)}
      />
  }
  return editable ? component : value;
}

class HistoryWork extends Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [{
        title: '#',
        dataIndex: 'index',
        key: 'index',
        width:'2.5em',
      }, {
        title: '日期',
        dataIndex: 'date',
        key: 'date',
        width:'10em',
        render: (text, record) => this.editable(text, record, 'date'),
      }, {
        title: '产品',
        dataIndex: 'product_name',
        key: 'product_name',
        width:'10em',
        render: (text, record) => this.editable(text, record, 'product_name'),
      }, {
        title: '工序',
        dataIndex: 'procedure_name',
        key: 'procedure_name',
        width:'10em',
        render: (text, record) => this.editable(text, record, 'procedure_name'),
      }, {
        title: '工价(￥)',
        dataIndex: 'price',
        key: 'price',
        width:'10em',
      }, {
        title: '数量',
        dataIndex: 'count',
        key: 'count',
        width:'10em',
        render: (text, record) => this.editable(text, record, 'count'),
      }, {
        title: '计价(￥)',
        dataIndex: 'reward',
        key: 'reward',
        width:'10em',
      }, {
        title: '操作',
        key: 'action',
        width:'5em',
        render: (text, record) => {
          const { editable } = record;
          return (
            <div className="editable-row-operations">
              {
                editable ?
                <span>
                  <Button type='link' style={{padding:0}} onClick={() => this.save(record.index)}>保存</Button>&nbsp;
                  {
                    record.isNewRecord===true ?
                    <Button type='link' style={{padding:0}} onClick={() => this.remove(record.index)}>删除</Button> :
                    <Button type='link' style={{padding:0}} onClick={() => this.cancel(record.index)}>取消</Button>
                  }
                </span> :
                <span>
                  <Button type='link' style={{padding:0}} onClick={() => this.edit(record.index)}>编辑</Button>&nbsp;
                  <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record.index)}>
                    <Button type='link' style={{padding:0}}>删除</Button>
                  </Popconfirm>
                </span>
              }
            </div>
          );
        },
      }],
      staff: {},
      history_work: [],
      procedureOptions: [],
      autoCompleteData: [],
    };
    this.timer=0;
    this.cacheData = [];
  }

  componentWillMount(){
    moment.locale('zh-cn');
  }

  componentDidMount(){
  }

  componentWillReceiveProps(nextProps){
    if(this.props.staff._id !== nextProps.staff._id){
      this.load(nextProps);
    }
  } 

  load=(props)=>{
    let staff = props.staff;
    ipcRenderer.once('r-history_work', (event, history_work)=>{
      const len = history_work.length;
      history_work = history_work.map((v,i) => {v.index = len - i; return v;});
      this.setState({
        staff: staff,
        history_work: history_work,
      });
      this.cacheData = history_work;
      this.work_stat();
    })
    ipcRenderer.send('r-history_work', {staff_id: staff._id});
    //获取当前工价
    if(staff.product_name){
      ipcRenderer.once('r-product', (event, result)=>{
        const procedure_list = result.list[0].procedure;
        if(!procedure_list) return;
        const procedure = procedure_list.find(v => v.procedure_name.value === staff.procedure_name);
        if(!procedure) return;
        staff.price = procedure.price || 0;
        this.setState({ staff: staff });
      })
      ipcRenderer.send('r-product', {name: staff.product_name});
    }
  }

  //计件统计
  work_stat = () => {
    const start_week = moment().startOf('week').format('YYYY-MM-DD');
    const start_month = moment().startOf('month').format('YYYY-MM-DD');
    const last_month = moment(start_month).subtract(1, 'day').startOf('month').format('YYYY-MM-DD');
    const history_work = this.state.history_work;
    let stat = { week: 0, month: 0, last_month_salary: 0};
    for(let work of history_work){
      if(work.date >= start_week){
        stat.week += parseInt(work.count);
      }
      if(work.date >= start_month){
        stat.month += parseInt(work.count);
      }
      if(work.date >= last_month && work.date < start_month){
        stat.last_month_salary = parseFloat((stat.last_month_salary + parseFloat(work.reward)).toFixed(2));
      }
      if(work.date < last_month){
        break;
      }
    }
    this.props.onGetStat(stat);
  }

  //行内编辑开始
  editable(text, record, column) {
    return (
      <EditableCell
        editable={record.editable}
        value={text}
        column={column}
        onChange={value => this.handleChange(value, record.index, column)}
        onSelect={value => this.handleSelect(value, record.index, column)}
        record={record}
        onPressEnter={e=>this.save(record.index)}
        autoCompleteData={this.state.autoCompleteData}
        procedureOptions={this.state.procedureOptions}
      />
    );
  }

  //可编辑单元格实时输入处理验证
  handleChange(value, key, column) {
    const newData = [...this.state.history_work];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      if(column === 'product_name'){
        this.autoCompleteItem(value, key);
      }
      if(column === 'procedure_name'){
        let procedure = this.state.procedureOptions.find(v => v.procedure_name.value === value);
        target.price = procedure.price;
      }
      if(column === 'count'){
        let reward = target.price * 100 * value / 100;
        target.reward = reward;
      }
      target[column] = value;
      this.setState({'history_work': newData});
    }
  }

  handleSelect(value, key, column) {
    const newData = [...this.state.history_work];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      if(column==='product_name'){
        this.loadProcedure(value);
      }
      target[column] = value;
      this.setState({'history_work': newData});
    }
  }

  edit(key) {
    const newData = [...this.state.history_work];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      target.editable = true;
      this.setState({'history_work': newData}, () => {
        //初始化工序选项
        if(target.product_name){
          this.autoCompleteItem(target.product_name, '', () => {
            this.loadProcedure(target.product_name);
          })
        }
      });
    }
  }

  save(key) {
    const newData = [...this.state.history_work];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      if(!target.product_name){
        message.error('产品不能为空');
        return false;
      }
      if(!target.procedure_name){
        message.error('工序不能为空');
        return false;
      }
      delete target.editable;
      //数据库更新
      this.updateStorage(target, ()=>{
        //更新UI
        target.isNewRecord = false;
        this.setState({'history_work': newData});
        this.cacheData = newData.map(item => ({ ...item }));
        this.work_stat();
      });
    }
  }
  
  cancel(key) {
    const newData = [...this.state.history_work];
    const target = newData.filter(item => key === item.index)[0];
    if (target) {
      Object.assign(target, this.cacheData.filter(item => key === item.index)[0]);
      delete target.editable;
      this.setState({'history_work': newData});
    }
  }
  
  remove(key) {
    const history_work=[...this.state.history_work];
    const target = history_work.find(item => key === item.index);
    const newData = history_work.filter(item => item.index !== key); 
    this.removeStorage(target._id, () => {
      this.setState({'history_work': newData});
    })
  }
  //行内编辑结束

  addItem=(record={})=>{
    let data = [...this.state.history_work];
    let index = data.length ? (data[0].index + 1) : 1;
    let newRecord = {
      staff_id: this.state.staff._id,
      index:index,
      date: moment().format('YYYY-MM-DD'),
      product_name: this.state.staff.product_name,
      procedure_name: this.state.staff.procedure_name,
      price: this.state.staff.price,
      count:0,
      reward:0,
      isNewRecord:true,
    };
    //更新数据库
    this.addStorage(newRecord, (newDoc)=>{
      newRecord._id = newDoc._id;
      //更新UI
      data.unshift(newRecord);
      this.setState({'history_work': data}, ()=>{
        this.edit(newRecord.index)
      });
    })
  }

  //材料名自动完成
  autoCompleteItem=(value, key, callback='')=>{
    if(!value) return;
    value = value.toUpperCase();
    clearTimeout(this.timer);
    this.timer=setTimeout(() => {
      ipcRenderer.once('r-product', (event, docs)=>{
        docs = docs.list;
        //自动完成
        this.setState({autoCompleteData: docs}, () => {
          if(callback.constructor.name === 'Function') callback();
        })
      })
      ipcRenderer.send('r-product', {name: value});
    }, 250);
  }

  addStorage=(newData, cb)=>{
    ipcRenderer.once('c-history_work', (event, msg)=>{
      if(msg.isSuccess){
        cb(msg.newDoc);
      }
    })
    ipcRenderer.send('c-history_work', newData)
  }

  updateStorage=(newData, cb)=>{
    ipcRenderer.once('u-history_work', (event, msg)=>{
      if(msg.isSuccess){
        cb();
      }
    })
    ipcRenderer.send('u-history_work', newData)
  }

  removeStorage=(_id, cb)=>{
    ipcRenderer.once('d-history_work', (event, msg)=>{
      if(msg.isSuccess){
        cb();
      }
    })
    ipcRenderer.send('d-history_work', {
      _id: _id,
    })
  }

  loadProcedure = (value, callback = null) => {
    const target = this.state.autoCompleteData.find(v => v.name === value);
    const procedure_options = target.procedure || [];
    this.setState({procedureOptions: procedure_options}, () => {
      callback && callback();
    })
  }

  render() {
    return (
      <div>
        <Row style={{marginBottom:10}}>
          <Col span={24}>
            <Button style={{width:'100%'}} type="dashed" onClick={this.addItem}>+新增计件</Button>
          </Col>
        </Row>
        <Table {...{pagination:true}} dataSource={this.state.history_work} columns={this.state.columns} rowKey='index' size="small" />
      </div>
    )
  }
}

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
)(HistoryWork)