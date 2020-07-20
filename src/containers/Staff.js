import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Input, Table, Row, Col, Popconfirm, Modal, Divider, Form, Button } from 'antd';
import StaffForm from './StaffForm';
import '../App.css';
const {ipcRenderer} = window.require('electron')
const Search = Input.Search;
const FormItem = Form.Item;

class Staff extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
      filteredInfo: null,
      sortedInfo: { field: 'staff_name', order: 'ascend' },
      modal:{
        modalVisible: false,
        confirmLoading: false,
      },
    };
  }
  
  componentDidMount() {
    this.fetch();
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
    ipcRenderer.once('r-staff', (event, args)=>{
      const pagination = { ...this.state.pagination };
      // Read total count from server
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list.map((item,index)=>Object.assign(item,{index:index+1})),
        pagination,
      });
    })
    ipcRenderer.send('r-staff', {
      results: 10,
      ...params
    });
  }

  onDelete=(id)=>{
    ipcRenderer.once('d-staff', (event, args)=>{
      const data = [...this.state.data];
      this.setState({ data: data.filter(item => item._id !== id) });
    })
    ipcRenderer.send('d-staff', id);
  }

  addStaff = () => {
    this.showModal(null)
  }
  
  gotoStaffDetail = (_id) =>{
    this.props.history.push("/StaffDetail", { _id: _id });
  }

  handleValidateFailed = () => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
  }

  showModal = (staff = null) => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      modalVisible: true,
    }
    this.setState({ modal:modalState });
  }

  modalOk = (type='staff') => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      confirmLoading: true,
    }
    this.setState({
      modal:modalState
    });
  }

  modalCancel = (type='staff') => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      modalVisible: false,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
  }

  onProcessOver = (type='staff') => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      modalVisible: false,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
    switch(type){
      case 'staff':
        this.handleTableChange({},{},{})
      break;
      default:;
    }
  }

  render() {
    let { sortedInfo, filteredInfo } = this.state;
    sortedInfo = sortedInfo || {};
    filteredInfo = filteredInfo || {};
    const columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: '3.5em',
    },{
      title: '姓名',
      dataIndex: 'staff_name',
      key: 'staff_name',
      sorter: true,
      width: '10em',
    },{
      title: '当前产品',
      dataIndex: 'product_name',
      key: 'product_name',
    }, {
      title: '当前工序',
      dataIndex: 'procedure_name',
      key: 'procedure_name',
    }, {
      title: '操作',
      key: '操作',
      width: '8em',
      render: (text, record) => {
        return (
          <span>
            <Button type='link' style={{padding:0}} onClick={()=>this.gotoStaffDetail(record._id)}>查看</Button>
            <Divider type='vertical' />
            <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.onDelete(record._id)}>
              <Button type='link' style={{padding:0, color:'#f5222d'}}>删除</Button>
            </Popconfirm>
          </span>
        )
      },
    }];
    return (
        <div>
            <Row style={{marginBottom:16}}>
              <Col span={4}>
                <Button type="primary" onClick={() => this.addStaff()}>新增</Button>　
              </Col>
              <Col span={20}>
                <Form layout='inline' style={{textAlign:'right'}}>
                  <FormItem>
                    <Search 
                      placeholder="姓名" 
                      onChange={event=>this.setState({remoteFilter:{name:event.target.value}})} 
                      onSearch={()=>this.handleTableChange({},{},{})} 
                    />
                  </FormItem>
                </Form>
              </Col>
            </Row>
            <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={columns} rowKey='_id' size='small' />
            <Modal
              title={(this.staff?'编辑':'新增')+'员工'}
              okText="确定"
              cancelText="取消"
              visible={this.state.modal.modalVisible}
              onOk={()=>this.modalOk()}
              onCancel={()=>this.modalCancel()}
              confirmLoading={this.state.modal.confirmLoading}
            >
              <StaffForm
                staff = {null}
                onProcessOver = {()=>this.onProcessOver()}
                confirmLoading = {this.state.modal.confirmLoading}
                onValidateFailed = {()=>this.handleValidateFailed()}
              />
            </Modal>
        </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    staff: state.staff
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    update: (staff) => {
      if(staff._id){
        //编辑
        const o={...staff};
        for(let key in o){
          if(!(/_id|index|procedure/.test(key))){
            o[key]={value:o[key]}
          }
        }
        o.staff_name = o.name;
        dispatch({type:'UPDATE', staff:o})
      }else{
        //新建
        dispatch({type:'INIT'});
      }
    },
    onProcessOver: ()=>{
      //编辑完成后清空数据
      dispatch({type:'INIT'});
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Staff)