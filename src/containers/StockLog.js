import React, { Component } from 'react';
import { Input, Table, Row, Col } from 'antd';
import '../App.css';
import moment from 'moment';
const {ipcRenderer} = window.require('electron')
const Search = Input.Search;

class StockLog extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
    };
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
      width: '8em',
    }, {
      title: '操作',
      dataIndex: 'type',
      key: 'type',
      width: '6em',
    }, {
      title: '数量变化',
      dataIndex: 'num',
      key: 'num',
      sorter: true,
      width: '7em',
      render: text=>text>0?'+'+text:text
    }, {
      title: '备注',
      dataIndex: 'desc',
      key: 'desc',
    }, {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      sorter: true,
      width: '11em',
      render: (text)=>{
        return (
          moment(text).format('YYYY-MM-DD HH:mm:ss')
        )
      }
    }];
  }

  fetch = (params = {}) => {
    // console.log('params:', params);
    this.setState({ loading: true });
    ipcRenderer.once('r-stockLog', (event, args)=>{
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
    ipcRenderer.send('r-stockLog', {
      results: 10,
      ...params
    });
  }

  componentWillMount() {
    this.fetch();
  }

  handleTableChange = (pagination={}, filters={}, sorter={}) => {
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

  render() {
    return (
      <div>
        <Row style={{marginBottom:16}}>
          <Col span={6} offset={18}>
            <Search placeholder="物品名" onChange={event=>this.setState({remoteFilter:{item_name:event.target.value}})} onSearch={()=>this.handleTableChange({},{},{})} />
          </Col>
        </Row>
        <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='index' size='small' />
      </div>
    );
  }
}

export default StockLog;