import React, { Component } from 'react';
import { Form, Input, Button, Table, Row, Col, Icon } from 'antd';
import OrderForm from './OrderForm';
import './App.css';
const {ipcRenderer} = window.require('electron')
const columns = [{
  title: '产品',
  dataIndex: 'product_name',
  key: 'product_name',
}, {
  title: '数量',
  dataIndex: 'qty',
  key: 'qty',
}, {
  title: '日期',
  dataIndex: 'date',
  key: 'date',
}, {
  title: '备注',
  dataIndex: 'note',
  key: 'note',
}];

class App extends Component {
  state={
    data:[],
    pagination: {},
    loading: false
  };

  handleTableChange = (pagination, filters, sorter) => {
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;
    this.setState({
      pagination: pager
    });
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
    ipcRenderer.once('r-order', (event, data)=>{
      console.log(this)
      const pagination = { ...this.state.pagination };
      // Read total count from server
      // pagination.total = data.totalCount;
      pagination.total = 200;
      this.setState({
        loading: false,
        data: data,
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
        <header>
          <input type='text'/> <input type='submit' /> <button>新增</button>
        </header>
        <Table dataSource={this.state.data} loading={this.state.loading} onChange={this.handleTableChange} columns={columns} />
        <OrderForm />
      </div>
    );
  }
}

export default App;
