import React, { Component } from 'react';
import { Form, Input, Button, Table, Row, Col, Icon, Divider } from 'antd';
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

ipcRenderer.send('r-order', '')
ipcRenderer.on('r-order', function(event, args){
  console.log(args)
})

const dataSource = [{
  key: '1',
  name: '胡彦斌',
  age: 32,
  address: '西湖区湖底公园1号'
}, {
  key: '2',
  name: '胡彦祖',
  age: 42,
  address: '西湖区湖底公园1号'
}];

class App extends Component {
  render() {
    return (
      <div className="App">
        <header>
          <input type='text'/> <input type='submit' /> <button>新增</button>
        </header>
        <Table {...{pagination:false}} dataSource={dataSource} columns={columns} />
        <OrderForm />
      </div>
    );
  }
}

export default App;
