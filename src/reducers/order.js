import moment from 'moment';
// reducer
export default function (state, action) {
  const blankOrder={
    product_name:{ value:'' },
    qty:{ value:0, originValue:0 },
    date:{ value:moment() },
    customer_name:{ value:'' },
    scrap_rate:{ value:0 },
    note:{ value:'' },
    status:{ value:'未生产' },
  };
  if (!state) {
    state = {...blankOrder}
  }
  switch (action.type) {
    case 'INIT_ORDER':
      return {...blankOrder};
    case 'UPDATE_ORDER':
      // 更新当前订单
      let order={
        ...state,
        ...action.order
      };
      if(!order.qty.hasOwnProperty('originValue')){
        order.qty.originValue=order.qty.value
      }
      if(action.order.hasOwnProperty('qty')){
        order.qty={...state.qty, ...action.order.qty}
      }
      return order;
    default:
      return state;
  }
}