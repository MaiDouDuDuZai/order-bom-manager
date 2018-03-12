import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Input, Button, Table, Row, Col, Popconfirm, Modal, Divider } from 'antd';
import OrderForm from './OrderForm';
import StockInout from './StockInout';
import '../App.css';
import moment from 'moment';
const {ipcRenderer} = window.require('electron')
const Search = Input.Search;

class Order extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
      modal:{
        order:{
          modalVisible: false,
          confirmLoading: false,
        },
        stockInout:{
          modalVisible: false,
          confirmLoading: false,
          type:'in'//out 入库/领料
        }
      },
    };
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: '2em',
    },{
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name',
      sorter: true,
      width: '9em',
    }, {
      title: '数量',
      dataIndex: 'qty',
      key: 'qty',
      width: '5em',
    }, {
      title: '订单日期',
      dataIndex: 'date',
      key: 'date',
      sorter: true,
      width: '8em',
      render: (text)=>{
        return (
          moment(text).utcOffset(480).format('YYYY-MM-DD')
        )
      }
    }, {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width:'12em',
    }, {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    }, {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '6em',
    }, {
      title: '操作',
      key: '操作',
      width: '16em',
      render: (text, record) => {
        return (
          <span>
            <a onClick={()=>this.showModal(record)}>编辑</a>
            <Divider type='vertical' />
            <a onClick={() => this.showModal(record,'stockInout','in')}>物料入库</a>
            <Divider type='vertical' />
            <a onClick={() => this.showModal(record,'stockInout','out')}>领料</a>
            <Divider type='vertical' />
            <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.onDelete(record._id)}>
              <a style={{color:'#f5222d'}}>删除</a>
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

  fetch = (params = {}) => {
    // console.log('params:', params);
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
  
  showModal = (curOrder={product_name:''}, type='order', inout='in') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      modalVisible: true,
    }
    if(type==='stockInout'){
      modalState[type]['type']=inout;
    }
    this.setState({
      modal:modalState
    });
    this.props.onShowModal(curOrder);
  }
  handleModalOk = (type='order') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      confirmLoading: true,
    }
    this.setState({
      modal:modalState
    });
  }
  handleModalCancel = (type='order') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      modalVisible: false,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
  }
  onProcessOver = (type='order') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      modalVisible: false,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
    switch(type){
      case 'order':
        this.handleTableChange({},{},{})
      break;
      case 'stockInout':

      break;
      default:;
    }
  }
  handleValidateFailed = (type='order') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
  }

  render() {
    return (
        <div>
            <Row style={{marginBottom:16}}>
              <Col span={2}>
                <Button type="primary" onClick={()=>this.showModal()}>新增</Button>
              </Col>
              <Col span={6} offset={16}>
                <Search 
                  placeholder="产品名" 
                  onChange={event=>this.setState({remoteFilter:{product_name:event.target.value}})} 
                  onSearch={()=>this.handleTableChange({},{},{})} 
                />
              </Col>
            </Row>
            <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='_id' />
            <Modal
              title={(this.props.order.product_name.value?'编辑':'新增')+"订单"}
              okText="确定"
              cancelText="取消"
              visible={this.state.modal.order.modalVisible}
              onOk={()=>this.handleModalOk('order')}
              onCancel={()=>this.handleModalCancel('order')}
              confirmLoading={this.state.modal.order.confirmLoading}
            >
              <OrderForm
                onProcessOver={()=>this.onProcessOver('order')}
                confirmLoading={this.state.modal.order.confirmLoading}
                onValidateFailed={()=>this.handleValidateFailed('order')}
              />
            </Modal>
            <Modal
              title={"出入库"}
              okText="确定"
              cancelText="取消"
              visible={this.state.modal.stockInout.modalVisible}
              onOk={()=>this.handleModalOk('stockInout')}
              onCancel={()=>this.handleModalCancel('stockInout')}
              confirmLoading={this.state.modal.stockInout.confirmLoading}
            >
              <StockInout
                type={this.state.modal.stockInout.type}
                onProcessOver={()=>this.onProcessOver('stockInout')}
                confirmLoading={this.state.modal.stockInout.confirmLoading}
                onValidateFailed={()=>this.handleValidateFailed('stockInout')}
              />
            </Modal>
        </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    order: state.order
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onShowModal: (order) => {
      if(order.product_name){
        const o={...order};
        for(let key in o){
          if(/_id|index/.test(key)===false){
            o[key]={value:o[key]}
          }
        }
        dispatch({type:'UPDATE_ORDER', order:o})
      }else{
        dispatch({type:'INIT_ORDER'});
      }
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Order)