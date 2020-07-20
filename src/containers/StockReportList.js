import React, { Component } from 'react';
import { Table, Row, Col, Button, message, Modal, Divider, Popconfirm } from 'antd';
import '../App.css';
import moment from 'moment';
import StockReportDetail from './StockReportDetail';
import ExportJsonExcel from 'js-export-excel';
const {ipcRenderer} = window.require('electron')

class StockReport extends Component {
  constructor(props) {
    super(props);
    this.state={
      data:[],
      loading: false,
      pagination: {},
      curId:'',
    };
    this.columns = [{
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: '2.5em',
    },{
      title: '创建时间',
      dataIndex: 'time',
      key: 'time',
      sorter: true,
      width: '12em',
      render: (text)=>{
        return (
          moment(text).format('YYYY-MM-DD HH:mm:ss')
        )
      }
    }, {
      title: '操作',
      key: '操作',
      className: 'text-right',
      render: (text, record) => {
        return (
          <span>
            <Button type='link' style={{padding:0}} onClick={() => this.showModal(record._id)}>查看</Button>
            <Divider type='vertical' />
            <Button type='link' style={{padding:0}} onClick={() => this.exportReport(record._id)}>导出</Button>
            <Divider type='vertical' />
            <Popconfirm title="确定删除?" okText="确定" cancelText="取消" onConfirm={() => this.remove(record._id)}>
              <Button type='link' style={{padding:0, color:'#f5222d'}}>删除</Button>
            </Popconfirm>
          </span>
        );
      },
    }];
  }

  componentWillMount() {
    this.fetch();
  }

  fetch = (params = {}) => {
    // console.log('params:', params);
    this.setState({ loading: true });
    ipcRenderer.once('r-stockReport', (event, args)=>{
      const pagination = { ...this.state.pagination };
      pagination.total = args.total;
      this.setState({
        loading: false,
        data: args.list,
        pagination,
      });
      this.cacheBomData=args.list.map(item => ({ ...item }))
    })
    ipcRenderer.send('r-stockReport', {
      results: 10,
      ...params
    });
  }

  handleTableChange = (pagination={}, filters={}, sorter={}) => {
    // console.log(filters);
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

  generate=()=>{
    ipcRenderer.once('c-stockReport', (event, args)=>{
      if(args.isSuccess){
        this.fetch();
      }else{
        message.error(args.msg)
      }
    })
    ipcRenderer.send('c-stockReport');
  }

  //模态框
  showModal = (curId) => {
    this.setState({
      modalVisible: true,
      curId,
    });
  }
  handleModalCancel = (e) => {
    this.setState({
      modalVisible: false,
    });
  }

  remove(key) {
    const data=[...this.state.data];
    const newData=data.filter(item=>item._id!==key); 
    ipcRenderer.send('d-stockReport', key)
    this.setState({data:newData});
  }

  exportReport(_id) {
    const target = this.state.data.filter(v=>v._id===_id)[0];
    this.setState({ loading: true });
    ipcRenderer.once('r-stockReport', (event, doc)=>{
      const list=doc.report;
      const cates={};//分类后的list
      for(let row of list){
        if(!row.cate){
          row.cate='未分类'
        }
        if(!cates[row.cate]){
          cates[row.cate]={data:[]}
        }
        row.index=cates[row.cate].data.length+1;
        cates[row.cate].data.push(row);
      }
      //未分类放最后面
      if(cates['未分类']){
        const noCate=cates['未分类'];
        delete cates['未分类'];
        cates['未分类']=noCate;
      }
      this.setState({
        loading: false,
      });
      var option = {};
      option.fileName = "库存报表导出" + target.time;
      option.datas = [];
      for (const key in cates) {
        option.datas.push({
          sheetData: cates[key].data,
          sheetName: key,
          sheetFilter: ['item_name','cate','desc','qty','prevQty','in','out','unit'],
          sheetHeader: ['物品','分类','描述','库存','上期库存','入库','出库','单位'],
          columnWidths: [10, 5, 10, 10, 10, 10, 10, 5],
        })
      }
      var toExcel = new ExportJsonExcel(option); //new
      toExcel.saveExcel(); //保存
    })
    ipcRenderer.send('r-stockReport', {
      results: 1,
      _id: _id,
    });
  }

  render() {
    return (
      <div>
        <Row style={{marginBottom:16}}>
          <Col span={2}>
            <Button type="primary" onClick={this.generate}>生成报表</Button>
          </Col>
        </Row>
        <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.handleTableChange} columns={this.columns} rowKey='_id' size='small' />
        <Modal
          title={"库存报表"}
          okText="确定"
          cancelText="取消"
          visible={this.state.modalVisible}
          onCancel={this.handleModalCancel}
          footer={null}
          width="900px"
          >
          <StockReportDetail id={this.state.curId} />
        </Modal>
      </div>
    )
  }
}

export default StockReport