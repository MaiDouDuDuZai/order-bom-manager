import React, { Component } from 'react';
import OrderForm from './OrderForm';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header>
          <input type='text'/> <input type='submit' /> <button>新增</button>
        </header>
        <table>
          <thead>
            <tr>
              <th>#</th><th>产品</th><th>数量</th><th>日期</th><th>备注</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
            
            </tr>
          </tbody>
        </table>
        <from>
          <input type="text" placeholder="产品" />
          <input type="number" placeholder="数量" />
          <input type="date" placeholder="日期" />
          <input type="text" placeholder="备注" />
          BOM
          <table>
            <thead>
              <tr>
                <th>#</th><th>材料</th><th>描述</th><th>用量</th><th>采购数</th><th>单位</th>
              </tr>
            </thead>
            <tbody>
              <tr>

              </tr>
            </tbody>
          </table>
          <input type="submit"/>
        </from>
        <OrderForm />
      </div>
    );
  }
}

export default App;
