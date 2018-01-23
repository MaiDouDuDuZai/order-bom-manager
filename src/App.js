import React, { Component } from 'react';
import { Layout, Input, Button, Table, Row, Col, Popconfirm, Modal, Divider } from 'antd';
import OrderForm from './OrderForm';
import './App.css';
import moment from 'moment';
const {ipcRenderer} = window.require('electron')
const { Header, Content } = Layout;
const Search = Input.Search;

class App extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
      visible: false,
      confirmLoading: false,
      curOrder:{}
    };
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index'
    },{
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: true,
    }, {
      title: '数量',
      dataIndex: 'qty',
      key: 'qty',
    }, {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      sorter: true,
      render: (text)=>{
        return (
          moment(text).utcOffset(480).format('YYYY-MM-DD')
        )
      }
    }, {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    }, {
      title: '操作',
      key: '操作',
      render: (text, record) => {
        return (
          <span>
            <a onClick={()=>this.showModal(record)}>编辑</a>
            <Divider type='vertical' />
            <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.onDelete(record._id)}>
              <a>删除</a>
            </Popconfirm>
          </span>
        )
      },
    }];
  }

  handleTableChange = (pagination, filters, sorter) => {
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;
    this.setState({
      pagination: pager
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

  fetch = (params = {}) => {
    console.log('params:', params);
    this.setState({ loading: true });
    ipcRenderer.once('r-order', (event, args)=>{
      const pagination = { ...this.state.pagination };
      // Read total count from server
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list.map((item,index)=>Object.assign(item,{index:index+1})),
        pagination,
      });
    })
    ipcRenderer.send('r-order', {
      results: 10,
      ...params
    });
  }

  onDelete=(id)=>{
    ipcRenderer.once('d-order', (event, args)=>{
      const data = [...this.state.data];
      this.setState({ data: data.filter(item => item._id !== id) });
    })
    ipcRenderer.send('d-order', id);
  }

  componentDidMount() {
    this.fetch();
  }
  
  showModal = (curOrder={product_name:''}) => {
    this.setState({
      visible: true,
      curOrder:curOrder
    });
  }
  handleModalOk = (e) => {
    this.setState({
      confirmLoading: true,
    });
  }
  handleModalCancel = (e) => {
    this.setState({
      visible: false,
      confirmLoading: false,
    });
  }
  onNewOrderCreated = () => {
    this.setState({
      visible: false,
      confirmLoading:false
    });
    this.handleTableChange({},{},{})
  }

  render() {
    return (
      <div className="App">
        <Header>
          <Row>
            <Col span={2}>
              <Button type="primary" onClick={()=>this.showModal()}>新增</Button>
            </Col>
            <Col span={8} offset={14}>
              <Search placeholder="产品名" onChange={event=>this.setState({remoteFilter:{product_name:event.target.value}})} onSearch={()=>this.handleTableChange({},{},{})} />
            </Col>
          </Row>
        </Header>
        <Content>
          <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='_id' />
          <Modal
            title={(this.state.curOrder.product_name?'编辑':'新增')+"订单"}
            okText="确定"
            cancelText="取消"
            visible={this.state.visible}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}
            confirmLoading={this.state.confirmLoading}
          >
            <OrderForm
              onProcessOrderOver={this.onNewOrderCreated} 
              confirmLoading={this.state.confirmLoading} 
              onValidateFailed={()=>this.setState({confirmLoading:false})} 
              order={this.state.curOrder}
            />
          </Modal>
        </Content>
      </div>
    );
  }
}

export default App;
