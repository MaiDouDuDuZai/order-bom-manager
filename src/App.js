import React, { Component } from 'react';
import { Layout, Input, Button, Table, Row, Col, Popconfirm } from 'antd';
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
      remoteFilter:{}
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
          <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.onDelete(record._id)}>
            <a>删除</a>
          </Popconfirm>
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
  
  render() {
    return (
      <div className="App">
        <Header>
          <Row>
            <Col span={2}>
              <Button type="primary">新增</Button>
            </Col>
            <Col span={8} offset={14}>
              <Search placeholder="产品名" onChange={event=>this.setState({remoteFilter:{product_name:event.target.value}})} onSearch={()=>this.handleTableChange({},{},{})} />
            </Col>
          </Row>
        </Header>
        <Content>
          <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='_id' />
          <OrderForm onCreated={()=>this.handleTableChange({},{},{})} />
        </Content>
      </div>
    );
  }
}

export default App;
