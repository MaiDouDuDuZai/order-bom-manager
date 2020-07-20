import React, { Component } from 'react';
import { Layout, Menu, Icon } from 'antd';
import '../App.css';
import {MemoryRouter,Route,Link} from 'react-router-dom'
import Order from './Order';
import Stock from './Stock';
import StockLog from './StockLog';
import StockReportList from './StockReportList';
import Product from './Product';
import Staff from './Staff';
import StaffDetail from './StaffDetail';
import Recover from './Recover';
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
      <MemoryRouter
        initialEntries={[ '/order' ]}
        initialIndex={1}
      >
        <div className="App">
          <Layout style={{height:'100%'}}>
            <Sider 
              trigger={null}
              collapsible
              collapsed={this.state.collapsed}
            >
              <div className="logo">BOM管理工具</div>
                <Menu
                  theme='dark'
                  onClick={this.handleClick}
                  defaultOpenKeys={['sub1','sub2','sub3','sub4']}
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
                      <Link to="/Stock">库存</Link>
                    </Menu.Item>
                    <Menu.Item key="3">
                      <Link to="/StockLog">操作日志</Link>
                    </Menu.Item>
                  </SubMenu>
                  <SubMenu key="sub2" title={<span><Icon type="line-chart" /><span>报表</span></span>}>
                    <Menu.Item key="4">
                      <Link to="/StockReportList">库存报表</Link>
                    </Menu.Item>
                  </SubMenu>
                  <SubMenu key="sub3" title={<span><Icon type="inbox" /><span>计件</span></span>}>
                    <Menu.Item key="5">
                      <Link to="/Product">工序</Link>
                    </Menu.Item>
                    <Menu.Item key="6">
                      <Link to="/Staff">员工计件</Link>
                    </Menu.Item>
                  </SubMenu>
                  <SubMenu key="sub4" title={<span><Icon type="coffee" /><span>其它</span></span>}>
                    <Menu.Item key="7">
                      <Link to="/Recover">数据恢复</Link>
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
                  <Route exact path="/StockLog" component={StockLog}/>
                  <Route exact path="/StockReportList" component={StockReportList}/>
                  <Route exact path="/Product" component={Product}/>
                  <Route exact path="/Staff" component={Staff}/>
                  <Route exact path="/StaffDetail" component={StaffDetail}/>
                  <Route exact path="/Recover" component={Recover}/>
                </div>
              </Content>
            </Layout>
          </Layout>
        </div>
      </MemoryRouter>
    );
  }
}

export default App;
