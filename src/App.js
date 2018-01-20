import React, { Component } from 'react';
import { Layout, Form, Input, Button, Table, Row, Col, Icon } from 'antd';
import OrderForm from './OrderForm';
import './App.css';
const {ipcRenderer} = window.require('electron')
const { Header, Footer, Content } = Layout;
const Search = Input.Search;
const columns = [{
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
}, {
  title: '备注',
  dataIndex: 'note',
  key: 'note',
}];

class App extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{}
    };
  }

  remoteSearch = (value)=>{
    if(value){
      this.handleTableChange({},{},{})
    }
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
    ipcRenderer.send('r-order', {
      results: 10,
      ...params
    });
    ipcRenderer.once('r-order', (event, args)=>{
      const pagination = { ...this.state.pagination };
      // Read total count from server
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list,
        pagination,
      });
    })
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
              <Search placeholder="产品" onChange={event=>this.setState({remoteFilter:{product_name:event.target.value}})} onSearch={this.remoteSearch} enterButton />
            </Col>
          </Row>
        </Header>
        <Content>
          <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={columns} rowKey='_id' />
          <OrderForm />
        </Content>
      </div>
    );
  }
}

export default App;
