import React, { Component } from 'react';
import { Button, Modal } from 'antd';
import '../App.css';
const {ipcRenderer} = window.require('electron')

class Recover extends Component {
  constructor(props) {
    super(props);
    this.state={
      time: null,
      count: 0,
    };
  }

  componentWillMount() {
    ipcRenderer.once('backupInfo', (event, result) => {
      this.setState({
        time: result.time,
        count: result.count,
      })
    })
    ipcRenderer.send('backupInfo')
  }

  componentDidMount() {
  }

  recover() {
    Modal.warning({
      title: '注意',
      content: '原数据将被覆盖',
      maskClosable: true,
      onOk: ()=>{
        ipcRenderer.once('recover', (event, result) => {
          if(result.isSuccess){
            Modal.success({
              content: '恢复成功',
            });
          }
        })
        ipcRenderer.send('recover')
      }
    });
  }

  render() {
    return (
      <>
        <div style={{textAlign: 'center', lineHeight: '2'}}>
          * 每次软件启动时会自动备份<br/>
          * 当前备份时间: {this.state.time}<br/>
          * 当前备份文件数: {this.state.count}<br/>
        </div>
        <Button type="primary" onClick={this.recover} style={{margin: '10px auto', display:'block'}}>恢复</Button>
      </>
    );
  }
}

export default Recover;