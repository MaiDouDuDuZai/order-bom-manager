import React, { Component } from 'react';
import { Table, Tabs } from 'antd';
import '../App.css';
const {ipcRenderer} = window.require('electron')
const TabPane = Tabs.TabPane;

class StockReportDetail extends Component {
  constructor(props) {
    super(props);
    this.state={
      loading: false,
      cates:{
        // '骨架':{
        //   data:[],
        // },
        // '辅料':...
      }
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
      width: '9em',
    }, {
      title: '描述',
      dataIndex: 'desc',
      key: 'desc',
    }, {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: '4em',
    }, {
      title: '分类',
      dataIndex: 'cate',
      key: 'cate',
      width: '6em',
    }, {
      title: '上期库存',
      dataIndex: 'prevQty',
      key: 'prevQty',
      width: '7em',
      sorter: (a, b) => a.prevQty - b.prevQty,
    }, {
      title: '入库',
      dataIndex: 'in',
      key: 'in',
      width: '6em',
      sorter: (a, b) => a.in - b.in,
    }, {
      title: '领料',
      dataIndex: 'out',
      key: 'out',
      width: '6em',
      sorter: (a, b) => a.out - b.out,
    }, {
      title: '本期库存',
      dataIndex: 'qty',
      key: 'qty',
      width: '7em',
      sorter: (a, b) => a.qty - b.qty,
    }];
  }

  componentWillMount() {
    this.fetch();
  }

  componentWillReceiveProps(nextProps){
    if(this.props.id!==nextProps.id){
      this.fetch({_id: nextProps.id});;
    }else{
      this.fetch();
    }
  }

  fetch = (params = {_id: this.props.id}) => {
    // console.log('params:', params);
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
        cates
      });
    })
    ipcRenderer.send('r-stockReport', {
      results: 1,
      ...params
    });
  }

  onChange(pagination, filters, sorter) {
    // console.log('params', pagination, filters, sorter);
  }

  render() {
    return (
      <div>
        <Tabs>
          {
            Object.keys(this.state.cates).map(cate=>{
              return (
                <TabPane tab={cate} key={cate}>
                  <Table dataSource={this.state.cates[cate].data} pagination={false} loading={this.state.loading} columns={this.columns} onChange={this.onChange} rowKey='_id' size='small' />;
                </TabPane>
              )
            })
          }
        </Tabs>
      </div>
    );
  }
}

export default StockReportDetail