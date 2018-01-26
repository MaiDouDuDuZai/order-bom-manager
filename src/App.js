import React, { Component } from 'react';
import { Layout, Menu, Icon } from 'antd';
import './App.css';
import {BrowserRouter as Router,Route,Link} from 'react-router-dom'
import Order from './Order';
import Stock from './Stock';
import StockTake from './StockTake';
import StockReport from './StockReport';
const { Header, Content, Sider, Footer } = Layout;
const SubMenu = Menu.SubMenu;

class App extends Component {
  constructor(props) {
    super(props);
    this.state={};
  }

  toggle = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  }

  render() {
    return (
          <Router>
      <div className="App">
        <Layout style={{height:'100%'}}>
          <Sider 
            width='200' 
            style={{background:'#fff'}}
            trigger={null}
            collapsible
            collapsed={this.state.collapsed}
          >
            <div className="logo" />
              <Menu
                onClick={this.handleClick}
                defaultOpenKeys={['sub1','sub2']}
                defaultSelectedKeys={['1']}
                mode="inline"
                >
                <Menu.Item key="1">
                  <Link to="/Order">
                    <Icon type="profile" />
                    <span>订单</span>
                  </Link>
                </Menu.Item>
                <SubMenu key="sub1" title={<span><Icon type="home" /><span>库存</span></span>}>
                  <Menu.Item key="2">
                    <Link to="/Stock">材料库存</Link>
                  </Menu.Item>
                  <Menu.Item key="3">
                    <Link to="/StockTake">库存盘点</Link>
                  </Menu.Item>
                </SubMenu>
                <SubMenu key="sub2" title={<span><Icon type="line-chart" /><span>报表</span></span>}>
                  <Menu.Item key="4">
                    <Link to="/StockReport">库存报表</Link>
                  </Menu.Item>
                </SubMenu>
              </Menu>
          </Sider>
          <Layout>
            <Header style={{ background: '#fff', padding: 0 }}>
              <Icon
                className="trigger"
                type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
                onClick={this.toggle}
                />
            </Header>
            <Content style={{ margin: '24px 16px', padding:'0 16 16'}}>
              <div style={{ background: '#fff', padding: 24, minHeight: 280 }}>
                <Route exact path="/Order" component={Order}/>
                <Route exact path="/Stock" component={Stock}/>
                <Route exact path="/StockTake" component={StockTake}/>
                <Route exact path="/StockReport" component={StockReport}/>
              </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              ©2018
            </Footer>
          </Layout>
        </Layout>
      </div>
    </Router>
    );
  }
}

export default App;
