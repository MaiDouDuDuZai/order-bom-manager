import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Input, Button, Select, Table, Row, Col, Popconfirm, Divider, Modal } from 'antd';
import '../App.css';
import StockForm from './StockForm';
import moment from 'moment';
const {ipcRenderer} = window.require('electron')
const Search = Input.Search;
const Option = Select.Option;

const EditableCell = ({ editable, value, column, onChange, record, cates }) => (
  <div>
    {
      editable ?
        column==='cate' ?
          <Select 
            style={{ width:'100%' }} 
            defaultValue={value}
            onChange={v => onChange(v)}
          >
            {cates.map(cate => <Option key={cate}>{cate}</Option>)}
          </Select>
        : <Input style={{ margin: '-5px 0' }} value={value} onChange={e => onChange(e.target.value)} />
      : value
    }
  </div>
);

class Stock extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
      modalVisible: false,
      confirmLoading: false,
    };
    this.cacheBomData = [];
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: '2.5em',
    },{
      title: '物品',
      dataIndex: 'item_name',
      key: 'item_name',
      sorter: true,
      width: '9em',
    }, {
      title: '描述',
      dataIndex: 'desc',
      key: 'desc',
      render: (text, record) => this.renderColumns(text, record, 'desc'),
    }, {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      render: (text, record) => this.renderColumns(text, record, 'unit'),
      width: '5em',
    }, {
      title: '分类',
      dataIndex: 'cate',
      key: 'cate',
      render: (text, record) => this.renderColumns(text, record, 'cate'),
      width: '8em',
    }, {
      title: '库存',
      dataIndex: 'qty',
      key: 'qty',
      sorter: true,
      width: '6em',
      render: (text, record) => this.renderColumns(text, record, 'qty'),
    }, {
      title: '最后更新',
      dataIndex: 'modified',
      key: 'modified',
      sorter: true,
      width: '11em',
      render: (text)=>{
        return (
          moment(text).format('YYYY-MM-DD HH:mm:ss')
        )
      }
    }, {
      title: '操作',
      key: '操作',
      width: '9em',
      render: (text, record) => {
        const { editable } = record;
        return (
          editable ?
            <span>
              <a onClick={() => this.save(record._id)}>保存</a>
              <Divider type='vertical' />
              <a onClick={() => this.cancel(record._id)}>取消</a>
            </span>
          :  <span>
              <a onClick={() => this.edit(record._id)}>编辑/盘点</a>
              <Divider type='vertical' />
              <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record._id)}>
                <a style={{color:'#f5222d'}}>删除</a>
              </Popconfirm>
            </span>
        );
      },
    }];
  }

  fetch = (params = {}) => {
    // console.log('params:', params);
    this.setState({ loading: true });
    ipcRenderer.once('r-stock', (event, args)=>{
      const pagination = { ...this.state.pagination };
      // Read total count from server
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list.map((item,index)=>Object.assign(item,{index:index+1})),
        pagination,
      });
      this.cacheBomData=args.list.map(item => ({ ...item }))
    })
    ipcRenderer.send('r-stock', {
      results: 10,
      ...params
    });
  }

  componentWillMount() {
    this.fetch();
  }

  //行内编辑开始
  renderColumns(text, record, column) {
    return (
      <EditableCell
        editable={record.editable}
        value={text}
        column={column}
        onChange={value => this.handleChange(value, record._id, column)}
        record={record}
        cates={this.props.cates}
      />
    );
  }
  //可编辑单元格实时输入处理验证
  handleChange(value, key, column) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      //材料名验证防重
      if(column==='item_name'){
        let vaildate=[];
        if(!value){
          vaildate.push('empty');
        }else{
          let savedData=newData.filter(item=>!item.editable);
          for(let i in savedData){
            if(new RegExp(savedData[i][column].value,'i').test(value)){
              vaildate.push('dulplicate');
              break;
            }
          }
        }
        //验证通过时再运行自动完成
        if(vaildate.length===0){
          this.autoCompleteItem(value, key);
        }
        //此处value赋值的时机会影响autoCompleteItem的第一个参数取值
        value={
          value: value=value?value.toUpperCase():'',//转大写
          vaildate: vaildate
        };
      }
      //单位转大写
      if(['unit'].includes(column)){
        value=value?value.toUpperCase():'';
      }
      target[column] = value;
      this.setState({ data: newData });
    }
  }

  edit(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      target.editable = true;
      this.setState({ data: newData });
    }
  }

  save(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      delete target.editable;
      this.setState({ data: newData });
      //库存变化写入日志
      const cacheTarget = this.cacheBomData.filter(item => key === item._id)[0];
      if(target.qty!==cacheTarget.qty){
        ipcRenderer.send('c-stockLog',{
          item_name:target.item_name,
          num:target.qty-cacheTarget.qty,
          type:'盘点'
        });
      }

      this.cacheBomData = newData.map(item => ({ ...item }));
      //更新插入item表
      ipcRenderer.send('u-itemStock', JSON.stringify(target))
    }
  }
  
  cancel(key) {
    const newData = [...this.state.data];
    const target = newData.filter(item => key === item._id)[0];
    if (target) {
      Object.assign(target, this.cacheBomData.filter(item => key === item._id)[0]);
      delete target.editable;
      this.setState({ data: newData });
    }
  }
  
  remove(key) {
    const data=[...this.state.data];
    const newData=data.filter(item=>item._id!==key); 
    const target=data.filter(item=>item._id===key)[0];
    ipcRenderer.send('d-stock', key)
    ipcRenderer.send('c-stockLog',{
      item_name:target.item_name,
      type:'刪除'
    });
    this.setState({data:newData});
  }
  //行内编辑结束

  handleTableChange = (pagination={}, filters={}, sorter={}) => {
    console.log(filters);
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;
    this.setState({
      pagination: pager,
      collapsed: false,
    });
    Object.assign(filters, this.state.remoteFilter)
    this.fetch({
      results: pagination.pageSize,
      page: pagination.current,
      sortField: sorter.field,
      sortOrder: sorter.order,
      ...filters,
    });
  }

  //模态框
  showModal = (curOrder={product_name:''}) => {
    this.setState({
      modalVisible: true,
    });
    this.props.initItemStock();
  }
  handleModalOk = (e) => {
    this.setState({
      confirmLoading: true,
    });
  }
  handleModalCancel = (e) => {
    this.setState({
      modalVisible: false,
      confirmLoading: false,
    });
  }
  handleValidateFailed = () => {
    this.setState({
      confirmLoading: false,
    });
  }
  afterCreated = () => {
    this.setState({
      modalVisible: false,
      confirmLoading:false
    });
    this.handleTableChange({},{},{})
  }

  render() {
    return (
      <div>
        <Row style={{marginBottom:16}}>
          <Col span={2}>
            <Button type="primary" onClick={this.showModal}>新增</Button>
          </Col>
          <Col span={6} offset={16}>
            <Search placeholder="材料名" onChange={event=>this.setState({remoteFilter:{item_name:event.target.value}})} onSearch={()=>this.handleTableChange({},{},{})} />
          </Col>
        </Row>
        <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='_id' size='small' />
        <Modal
          title={"新增物品库存"}
          okText="确定"
          cancelText="取消"
          visible={this.state.modalVisible}
          onOk={this.handleModalOk}
          onCancel={this.handleModalCancel}
          confirmLoading={this.state.confirmLoading}
          >
          <StockForm 
            afterCreated={this.afterCreated} 
            confirmLoading={this.state.confirmLoading}
            onValidateFailed={this.handleValidateFailed}
          />
        </Modal>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    cates: state.cates
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    initItemStock:() => {
      dispatch({type:'INIT_ITEMSTOCK'});
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Stock)