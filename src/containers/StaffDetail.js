import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Form, Input, AutoComplete, Modal, Button, message, PageHeader, Statistic, Descriptions } from 'antd';
import HistoryWork from '../components/HistoryWork';
import StaffForm from './StaffForm';
import { setTimeout } from 'core-js/library/web/timers';
const {ipcRenderer} = window.require('electron')
const FormItem = Form.Item;

class StaffDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      staff: {},
      autoCompleteData: [],
      modal:{
        modalVisible: false,
        confirmLoading: false,
      },
    };
    this.timer=0;
  }

  componentDidMount() {
    const _id = this.props.history.location.state._id;
    if( _id !== this.state.staff._id ){
      this.readStaff(_id);
    }
  }

  componentWillReceiveProps(nextProps){
    if(this.props.confirmLoading!==nextProps.confirmLoading && nextProps.confirmLoading===true){
      this.handleSubmit()
    }
  }

  readStaff = (_id) => {
    ipcRenderer.once('r-staff', (event, data)=>{
      let staff=data.list[0];
      this.setState({staff: staff});
    })
    ipcRenderer.send('r-staff', {_id: _id})
  }
  
  handleSubmit = (e) => {
    e && e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        if(this.props.product._id){
          //更新
          let sendData={...this.props.product, ...this.props.form.getFieldsValue()};
          delete sendData.index;
          ipcRenderer.once('u-product', (event, args)=>{
            if(args.isSuccess){
              this.props.onProcessOver()
            }
          })
          ipcRenderer.send('u-product', sendData);
        }else{
          //新增
          let sendData = this.props.form.getFieldsValue();
          sendData.name = sendData.product_name;
          delete sendData.product_name;
          sendData.procedure = this.props.product.procedure;
          ipcRenderer.once('c-product', (event, args)=>{
            if(!args.isSuccess){
              message.error(args.msg);
            }
            this.props.onProcessOver()
          })
          ipcRenderer.send('c-product', JSON.stringify(sendData))
        }
      }else{
        this.props.onValidateFailed()
      }
    });
  }

  readProduct=()=>{
    //fetch autoComplete data
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>{
      ipcRenderer.once('r-product', (event, data)=>{
        let docs=data.list;
        this.setState({autoCompleteData:docs});
      })
      ipcRenderer.send('r-product', {name:this.props.product.product_name.value})
    },250)
  }

  editStaff = () => {
    this.showModal()
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

  showModal = () => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      modalVisible: true,
    }
    this.setState({ modal:modalState });
  }

  modalOk = () => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      confirmLoading: true,
    }
    this.setState({
      modal:modalState
    });
  }

  modalCancel = () => {
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

  onProcessOver = () => {
    let modalState={...this.state.modal};
    modalState={
      ...modalState,
      modalVisible: false,
      confirmLoading: false,
    }
    this.setState({
      modal:modalState
    });
    this.readStaff(this.state.staff._id)
  }

  onGetStat = (stat) => {
    const staff = {
      ...this.state.staff, 
      stat_week: stat.week,
      stat_month: stat.month,
      last_month_salary: stat.last_month_salary,
    };
    this.setState({ staff: staff});
  }
  
  render() {
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 2 },
      wrapperCol: { span: 21 },
    };

    return (
      <>
        <PageHeader
          className="site-page-header-responsive"
          onBack={() => this.props.history.goBack()}
          title="员工详情"
          subTitle="计件"
          extra={[
            <Button key="1" type="default" onClick={()=>this.editStaff()}>编辑</Button>,
          ]}
        >
          <div className="content">
            <div className="main">
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="姓名">{this.state.staff.staff_name}</Descriptions.Item>
                <Descriptions.Item label="当前工序">{this.state.staff.procedure_name}</Descriptions.Item>
                <Descriptions.Item label="当前产品">{this.state.staff.product_name}</Descriptions.Item>
                <Descriptions.Item label="备注">{this.state.staff.note}</Descriptions.Item>
              </Descriptions>
            </div>
            <div className="extra">
              <div style={{display: 'flex', width: 'max-content', justifyContent: 'flex-end'}}>
                <Statistic title="本周总计" value={this.state.staff.stat_week} suffix="件" style={{marginRight: 32}} />
                <Statistic title="本月总计" value={this.state.staff.stat_month} suffix="件" style={{marginRight: 32}} />
                <Statistic title="上月工资" value={this.state.staff.last_month_salary} prefix="￥" style={{marginRight: 32}} />
              </div>
            </div>
          </div>
        </PageHeader>

        <HistoryWork staff={{...this.state.staff}} onGetStat={this.onGetStat} />

        <Modal
          title={'编辑员工'}
          okText="确定"
          cancelText="取消"
          visible={this.state.modal.modalVisible}
          onOk={()=>this.modalOk()}
          onCancel={()=>this.modalCancel()}
          confirmLoading={this.state.modal.confirmLoading}
        >
          <StaffForm
            staff = {this.state.staff}
            onProcessOver = {()=>this.onProcessOver()}
            confirmLoading = {this.state.modal.confirmLoading}
            onValidateFailed = {()=>this.handleValidateFailed()}
          />
        </Modal>
      </>
    );
  }
}

const WrappedForm = Form.create({
  mapPropsToFields(props) {
    return {
      product_name: Form.createFormField({
        ...props.product.product_name,
        value: props.product.product_name.value,
      }),
      note: Form.createFormField({
        ...props.product.note,
        value: props.product.note.value,
      }),
    };
  },
  onFieldsChange(props, changedFields) {
    if(changedFields.product_name && changedFields.product_name.value){
      changedFields.product_name.value = changedFields.product_name.value.toUpperCase();
    }
    props.updateProduct(changedFields);
  },
})(StaffDetail);

const mapStateToProps = (state) => {
  return {
    product: state.product,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateProduct: (changedFields) => {
      dispatch({type:'UPDATE', product:changedFields})
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WrappedForm)