import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Input, Table, Row, Col, Popconfirm, Modal, Divider, Form, Button, Alert } from 'antd';
import ProductForm from './ProductForm';
import '../App.css';
const {ipcRenderer} = window.require('electron')
const Search = Input.Search;
const FormItem = Form.Item;

class Product extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      pagination: {},
      loading: false,
      remoteFilter:{},
      filteredInfo: null,
      sortedInfo: { field: 'name', order: 'ascend' },
      modal:{
        product:{
          modalVisible: false,
          confirmLoading: false,
        },
      },
    };
    this.checkResult = {duplicate:{}};
  }

  componentDidMount() {
    this.check();
    this.fetch({
      sortField: this.state.sortedInfo.field,
      sortOrder: this.state.sortedInfo.order,
    });
  }

  //校验，查重
  check = () => {
    this.setState({ loading: true });
    ipcRenderer.once('r-productAll', (event, args)=>{
      this.setState({
        loading: false,
      });
      const origin = args.list;
      //同型号去重
      const names_origin = origin.map(v=>v.name);
      const names_unique = new Set(names_origin);
      //去重后的长度
      if(names_origin.length !== names_unique.size){
        //统计重复次数
        let name_count = {};
        origin.map(v=>{
          if(!name_count[v.name]){
            name_count[v.name] = 0;
          }
          name_count[v.name]++;
        })
        let name_duplicate = [];
        for (const v in name_count) {
          if(name_count[v] > 1){
            name_duplicate[v] = name_count[v];
          }
        }
        this.checkResult = { duplicate: name_duplicate};
      }
    })
    ipcRenderer.send('r-productAll', {});
  }

  //显示重复的数据
  showDuplicate = () => {
    let filter = {
      sortField: 'name',
      name: Object.keys(this.checkResult.duplicate).join('|')
    };
    this.fetch(filter);
  }
  
  handleTableChange = (pagination, filters, sorter) => {
    // console.log(filters, sorter)
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;
    this.setState({
      pagination: pager,
      collapsed: false,
      filteredInfo: filters,
      sortedInfo: sorter,
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
    ipcRenderer.once('r-product', (event, args)=>{
      const pagination = { ...this.state.pagination };
      // Read total count from server
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list.map((item,index)=>Object.assign(item,{index:index+1})),
        pagination,
      });
    })
    ipcRenderer.send('r-product', {
      results: 10,
      ...params
    });
  }

  onDelete=(id)=>{
    ipcRenderer.once('d-product', (event, args)=>{
      const data = [...this.state.data];
      this.setState({ data: data.filter(item => item._id !== id) });
    })
    ipcRenderer.send('d-product', id);
  }
  
  showModal = (curProduct={name:''}, type='product') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      modalVisible: true,
    }
    this.setState({
      modal:modalState
    });
    //清空顶层product的条件 1.编辑取消后新建时 2.编辑不同订单时
    if(this.props.product._id !== curProduct._id){
      this.props.update(curProduct);
    }
  }
  handleModalOk = (type='product') => {
    const modalState={...this.state.modal};
    modalState[type]={
      ...modalState[type],
      confirmLoading: true,
    }
    this.setState({
      modal:modalState
    });
  }
  handleModalCancel = (type='product') => {
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
  onProcessOver = (type='product') => {
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
      case 'product':
        this.handleTableChange({},{},this.state.sortedInfo)
        // this.props.onProcessOver();
      break;
      default:;
    }
  }
  handleValidateFailed = (type='product') => {
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
    let { sortedInfo, filteredInfo } = this.state;
    sortedInfo = sortedInfo || {};
    filteredInfo = filteredInfo || {};
    const columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: '3.5em',
    },{
      title: '产品',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortedInfo.field === 'name' && sortedInfo.order,
      width: '10em',
    }, {
      title: '工序',
      dataIndex: 'procedure',
      key: 'procedure',
      render: (text, record) => {
        text = text || [];
        let content = text.reduce((total, v) => {
          return total + v.procedure_name.value + ',';
        }, '');
        content = content.substr(0, content.length - 1);
        return (<span>{content}</span>);
      },
    }, {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
    }, {
      title: '操作',
      key: '操作',
      width: '8em',
      render: (text, record) => {
        return (
          <span>
            <Button type='link' style={{padding:0}} onClick={()=>this.showModal(record)}>编辑</Button>
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
        { 
          Object.keys(this.checkResult.duplicate).length ? (
            <Alert
              message='产品重复'
              description={<>检测到有{Object.keys(this.checkResult.duplicate).join()}等{Object.keys(this.checkResult.duplicate).length}条重复的产品记录，<Button type='link' style={{padding:0, lineHeight: 1, height:'auto'}} onClick={this.showDuplicate}>点击查看</Button></>}
              banner
              closable
              style={{marginBottom:'1em'}}
            />
          ) : null
        }
        <Row style={{marginBottom:16}}>
          <Col span={2}>
            <Button type="primary" onClick={()=>this.showModal()}>新增</Button>
          </Col>
          <Col span={22}>
            <Form layout='inline' style={{textAlign:'right'}}>
              <FormItem>
              <Search 
                placeholder="产品名" 
                onChange={event=>this.setState({remoteFilter:{name:event.target.value}})} 
                onSearch={()=>this.handleTableChange({},{},{})} 
              /></FormItem>
              </Form>
          </Col>
        </Row>
        <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={columns} rowKey='_id' size='small' />
        <Modal
          title={(this.props.product._id?'编辑':'新增')+'产品'}
          width="1100px"
          okText="确定"
          cancelText="取消"
          visible={this.state.modal.product.modalVisible}
          onOk={()=>this.handleModalOk('product')}
          onCancel={()=>this.handleModalCancel('product')}
          confirmLoading={this.state.modal.product.confirmLoading}
        >
          <ProductForm
            onProcessOver={()=>this.onProcessOver('product')}
            confirmLoading={this.state.modal.product.confirmLoading}
            onValidateFailed={()=>this.handleValidateFailed('product')}
          />
        </Modal>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    product: state.product
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    update: (product) => {
      if(product._id){
        //编辑
        const o={...product};
        for(let key in o){
          if(!(/_id|index|procedure/.test(key))){
            o[key]={value:o[key]}
          }
        }
        o.product_name = o.name;
        dispatch({type:'UPDATE', product:o})
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
)(Product)